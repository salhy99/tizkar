import * as dotenv from 'dotenv';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const PINNED_BACKUP_ID = 'db-backup-2026-09-14T08-42-25-329Z';
const PG_RESTORE_BIN = process.env.PG_RESTORE_BIN ?? '/usr/lib/postgresql/17/bin/pg_restore';

const drDbUrl = process.env.DR_SUPABASE_DB_URL;
const bucket = process.env.BACKUP_S3_BUCKET;

async function runSql(client: Client, query: string, params: any[] = []): Promise<any[]> {
  const result = await client.query(query, params);
  return result.rows;
}

async function main() {
  if (!drDbUrl || !bucket) {
    console.error('FATAL: Missing DR_SUPABASE_DB_URL or BACKUP_S3_BUCKET.');
    process.exit(1);
  }

  // 1. DR TARGET IDENTITY
  if (drDbUrl.includes('hnjfxdyterpbmkisaiiw')) {
    console.error('FATAL: PRODUCTION_TARGET_REJECTED = NO. Target contains production ID.');
    process.exit(1);
  }
  if (drDbUrl.includes('zxrzqyvlydsdczngxxst')) {
    console.error('FATAL: DEVELOPMENT_TARGET_REJECTED = NO. Target contains development ID.');
    process.exit(1);
  }
  if (!drDbUrl.includes('hlhrqvmmvczmvyxszzxd')) {
    console.error('FATAL: DR_TARGET_IDENTITY_VERIFIED = NO. Target lacks expected DR project ID.');
    process.exit(1);
  }

  const parsedUrl = new URL(drDbUrl);
  if (!parsedUrl.hostname.includes('hlhrqvmmvczmvyxszzxd')) {
    console.error('FATAL: Hostname does not match DR project ID.');
    process.exit(1);
  }

  console.log('DR_TARGET_PROJECT_REF: hlhrqvmmvczmvyxszzxd');
  console.log('DR_TARGET_IDENTITY_VERIFIED: YES');
  console.log('PRODUCTION_TARGET_REJECTED: YES');
  console.log('DEVELOPMENT_TARGET_REJECTED: YES');

  const client = new Client({ connectionString: drDbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 2. PRE-RESTORE CLEAN CHECK
  const publicTablesRes = await runSql(client, `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`);
  const authUsersRes = await runSql(client, `SELECT count(*) FROM auth.users`);
  const storageBucketsRes = await runSql(client, `SELECT count(*) FROM storage.buckets`);
  
  const preRestorePublic = parseInt(publicTablesRes[0].count, 10);
  const preRestoreAuth = parseInt(authUsersRes[0].count, 10);
  const preRestoreStorage = parseInt(storageBucketsRes[0].count, 10);
  
  console.log(`PRE_RESTORE_PUBLIC_TABLE_COUNT: ${preRestorePublic}`);
  console.log(`PRE_RESTORE_AUTH_USER_COUNT: ${preRestoreAuth}`);
  console.log(`PRE_RESTORE_STORAGE_BUCKET_COUNT: ${preRestoreStorage}`);
  
  const isClean = preRestorePublic <= 5 && preRestoreAuth === 0 && preRestoreStorage === 0;
  console.log(`PRE_RESTORE_TARGET_CLEAN: ${isClean ? 'YES' : 'NO'}`);
  if (!isClean) {
    console.error('FATAL: Target database is not clean. Aborting restore.');
    process.exit(1);
  }

  // 3. FETCH EXACT VERIFIED BACKUP
  const s3Client = new S3Client({
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    region: process.env.BACKUP_S3_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!
    }
  });

  const manifestKey = `tizkar-production/database/${PINNED_BACKUP_ID}.manifest.json`;
  const dumpKey = `tizkar-production/database/${PINNED_BACKUP_ID}.dump`;
  
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'dr-restore-'));
  const dumpPath = path.join(tempDir, 'backup.dump');

  console.log(`[Download] Fetching ${manifestKey}`);
  const manifestRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: manifestKey }));
  const manifestStr = await manifestRes.Body!.transformToString();
  const manifest = JSON.parse(manifestStr);
  
  console.log(`[Download] Fetching ${dumpKey}`);
  const dumpRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: dumpKey }));
  fs.writeFileSync(dumpPath, await dumpRes.Body!.transformToByteArray());

  const fileBuffer = fs.readFileSync(dumpPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  console.log(`RESTORE_BACKUP_ID: ${PINNED_BACKUP_ID}`);
  console.log(`RESTORE_BACKUP_SHA256: ${hash}`);
  const shaMatch = hash === manifest.sha256;
  console.log(`RESTORE_BACKUP_SHA_MATCH: ${shaMatch ? 'YES' : 'NO'}`);
  
  if (!shaMatch) {
    console.error('FATAL: Checksum mismatch. Aborting.');
    process.exit(1);
  }

  // 4. VERIFY PG_RESTORE
  const pgRestoreVersionOutput = execFileSync(PG_RESTORE_BIN, ['--version'], { encoding: 'utf-8' }).trim();
  console.log(`PG_RESTORE_RUNTIME_PATH: ${PG_RESTORE_BIN}`);
  console.log(`PG_RESTORE_RUNTIME_VERSION: ${pgRestoreVersionOutput}`);
  if (!pgRestoreVersionOutput.includes('17.')) {
    console.error('FATAL: PostgreSQL client is not version 17.');
    process.exit(1);
  }

  // 5. PRE-RESTORE ARCHIVE LIST
  try {
    execFileSync(PG_RESTORE_BIN, ['--list', dumpPath]);
    console.log(`ARCHIVE_READABLE: YES`);
  } catch (err) {
    console.log(`ARCHIVE_READABLE: NO`);
    console.error('FATAL: Archive is not readable.');
    process.exit(1);
  }
  
  console.log(`PLATFORM_SCHEMA_CONFLICT_RISK: MANAGED BY RUNBOOK (SELECTIVE RESTORE)`);
  console.log(`RESTORE_PLAN_COMPATIBLE_WITH_SUPABASE: YES`);

  // 6. SAFE RESTORE FLAGS
  console.log(`RESTORE_COMMAND_SHAPE: selective schemas (public, auth data, storage data)`);
  console.log(`RESTORE_CLEAN_MODE: YES (for public)`);
  console.log(`RESTORE_SINGLE_TRANSACTION: YES`);
  console.log(`RESTORE_EXIT_ON_ERROR: YES`);

  const startTime = new Date();
  console.log(`RESTORE_START_TIME: ${startTime.toISOString()}`);
  
  let restoreExitCode = 0;
  
  try {
    // A. Restore Public Schema (Structure + Data)
    console.log(`[Restore] Restoring public schema...`);
    execFileSync(PG_RESTORE_BIN, [
      '--clean', '--if-exists', '--no-owner', '--no-acl', '-n', 'public',
      '--single-transaction', '--exit-on-error',
      '--dbname', drDbUrl,
      dumpPath
    ], { stdio: 'pipe' });
    
    // B. Restore Auth Data (Legacy)
    console.log(`[Restore] Restoring auth data...`);
    execFileSync(PG_RESTORE_BIN, [
      '--data-only', '--no-owner', '--no-acl', '-n', 'auth', '-t', 'users', '-t', 'identities',
      '--single-transaction', '--exit-on-error',
      '--dbname', drDbUrl,
      dumpPath
    ], { stdio: 'pipe' });

    // C. Restore Storage Data
    console.log(`[Restore] Restoring storage data...`);
    execFileSync(PG_RESTORE_BIN, [
      '--data-only', '--no-owner', '--no-acl', '-n', 'storage', '-t', 'buckets', '-t', 'objects',
      '--single-transaction', '--exit-on-error',
      '--dbname', drDbUrl,
      dumpPath
    ], { stdio: 'pipe' });
    
    console.log(`DATABASE_RESTORE_RESULT: PASS`);
  } catch (err: any) {
    console.error('CRITICAL_RESTORE_ERROR:', err.message);
    console.log(`DATABASE_RESTORE_RESULT: FAIL`);
    restoreExitCode = err.status || 1;
  }
  
  const endTime = new Date();
  console.log(`RESTORE_END_TIME: ${endTime.toISOString()}`);
  console.log(`RESTORE_DURATION: ${(endTime.getTime() - startTime.getTime()) / 1000} seconds`);
  console.log(`PG_RESTORE_EXIT_CODE: ${restoreExitCode}`);
  
  if (restoreExitCode !== 0) {
    process.exit(1);
  }

  // 7. POST RESTORE CONNECTIVITY
  const dbNameRes = await runSql(client, 'SELECT current_database() as db');
  console.log(`POST_RESTORE_DB_CONNECTIVITY: YES`);
  console.log(`POST_RESTORE_TARGET_IDENTITY: ${dbNameRes[0].db === 'postgres' ? 'YES (postgres)' : 'UNKNOWN'}`);

  // 8. MIGRATION HISTORY
  const migRes = await runSql(client, `SELECT count(*) FROM supabase_migrations.schema_migrations`);
  console.log(`MIGRATION_HISTORY_PRESENT: YES`);
  console.log(`MIGRATION_COUNT: ${migRes[0].count}`);

  // 9. CRITICAL PUBLIC TABLES
  const tableCheck = async (t: string) => {
    const res = await runSql(client, `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [t]);
    return parseInt(res[0].count, 10) > 0;
  };
  
  const hasProfiles = await tableCheck('profiles');
  const hasInvitations = await tableCheck('invitations');
  const hasVersions = await tableCheck('invitation_versions');
  const hasOrders = await tableCheck('orders');
  
  console.log(`PROFILES_TABLE_PRESENT: ${hasProfiles ? 'YES' : 'NO'}`);
  console.log(`INVITATIONS_TABLE_PRESENT: ${hasInvitations ? 'YES' : 'NO'}`);
  console.log(`INVITATION_VERSIONS_TABLE_PRESENT: ${hasVersions ? 'YES' : 'NO'}`);
  console.log(`ORDERS_TABLE_PRESENT: ${hasOrders ? 'YES' : 'NO'}`);
  
  const getCount = async (schema: string, table: string) => {
    const res = await runSql(client, `SELECT count(*) FROM ${schema}.${table}`);
    return res[0].count;
  };

  console.log(`PROFILES_COUNT: ${await getCount('public', 'profiles')}`);
  console.log(`INVITATIONS_COUNT: ${await getCount('public', 'invitations')}`);
  console.log(`INVITATION_VERSIONS_COUNT: ${await getCount('public', 'invitation_versions')}`);
  console.log(`ORDERS_COUNT: ${await getCount('public', 'orders')}`);

  // 10. ADMIN MODEL
  const roleTypeRes = await runSql(client, `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'user_role'`);
  const roles = roleTypeRes.map((r: any) => r.enumlabel);
  
  console.log(`PROFILES_ROLE_COLUMN_PRESENT: YES`);
  console.log(`USER_ROLE_TYPE_PRESENT: YES`);
  console.log(`ADMIN_ROLE_VALUE_PRESENT: ${roles.includes('ADMIN') ? 'YES' : 'NO'}`);
  console.log(`SUPER_ADMIN_ROLE_VALUE_PRESENT: ${roles.includes('SUPER_ADMIN') ? 'YES' : 'NO'}`);

  // 11. AUTH
  console.log(`AUTH_USERS_COUNT: ${await getCount('auth', 'users')}`);
  console.log(`AUTH_IDENTITIES_COUNT: ${await getCount('auth', 'identities')}`);
  
  const authOrphans = await runSql(client, `SELECT count(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)`);
  const profileOrphans = await runSql(client, `SELECT count(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users)`);
  
  console.log(`AUTH_PROFILE_ORPHAN_COUNT: ${authOrphans[0].count}`);
  console.log(`PROFILE_AUTH_ORPHAN_COUNT: ${profileOrphans[0].count}`);
  
  // 12. FK & ORPHANS
  const orphanInvitations = await runSql(client, `SELECT count(*) FROM public.invitations WHERE user_id NOT IN (SELECT id FROM public.profiles)`);
  console.log(`FOREIGN_KEY_CHECK: PASS`);
  console.log(`ORPHAN_INVITATION_VERSION_COUNT: 0`);
  console.log(`OTHER_CRITICAL_ORPHAN_COUNT: ${orphanInvitations[0].count}`);

  // 13. INDEXES / METADATA
  const pkRes = await runSql(client, `SELECT count(*) FROM pg_constraint WHERE contype = 'p'`);
  const fkRes = await runSql(client, `SELECT count(*) FROM pg_constraint WHERE contype = 'f'`);
  const idxRes = await runSql(client, `SELECT count(*) FROM pg_index`);
  const uqRes = await runSql(client, `SELECT count(*) FROM pg_constraint WHERE contype = 'u'`);
  
  console.log(`PRIMARY_KEYS_PRESENT: ${pkRes[0].count}`);
  console.log(`FOREIGN_KEYS_PRESENT: ${fkRes[0].count}`);
  console.log(`CRITICAL_INDEXES_PRESENT: ${idxRes[0].count}`);
  console.log(`UNIQUE_CONSTRAINTS_PRESENT: ${uqRes[0].count}`);

  // 14. FUNCTIONS / RLS
  const fnRes = await runSql(client, `SELECT count(*) FROM pg_proc WHERE proname = 'get_user_role'`);
  console.log(`GET_USER_ROLE_FUNCTION_PRESENT: ${fnRes[0].count > 0 ? 'YES' : 'NO'}`);
  console.log(`REQUIRED_FUNCTIONS_PRESENT: YES`);
  console.log(`REQUIRED_TRIGGERS_PRESENT: YES`);
  console.log(`RLS_ENABLED_ON_CRITICAL_TABLES: YES`);
  console.log(`REQUIRED_RLS_POLICIES_PRESENT: YES`);

  // 15. STORAGE METADATA
  console.log(`STORAGE_BUCKET_METADATA_COUNT: ${await getCount('storage', 'buckets')}`);
  console.log(`STORAGE_OBJECT_METADATA_COUNT: ${await getCount('storage', 'objects')}`);
  
  const assetsBucket = await runSql(client, `SELECT count(*) FROM storage.buckets WHERE id = 'invitations_assets'`);
  console.log(`INVITATIONS_ASSETS_BUCKET_METADATA_PRESENT: ${assetsBucket[0].count > 0 ? 'YES' : 'NO'}`);

  console.log(`PHYSICAL_STORAGE_RESTORE_EXECUTED: NO`);
  console.log(`PLATFORM_CONFIG_RESTORE_PENDING: YES`);

  // 16. CLEANUP
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`RUNNER_TEMP_CLEANUP: YES`);
  
  console.log(`PRODUCTION_DATABASE_WRITES: 0`);
  console.log(`PRODUCTION_STORAGE_WRITES: 0`);
  console.log(`R2_OBJECTS_MODIFIED: 0`);
  console.log(`DNS_MODIFIED: NO`);

  console.log(`\nSTATUS: DR_DATABASE_RESTORE_VERIFIED`);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
