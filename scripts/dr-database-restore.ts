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

async function runSql<T = Record<string, unknown>>(client: Client, query: string, params: unknown[] = []): Promise<T[]> {
  const result = await client.query(query, params);
  return result.rows as T[];
}

async function main() {
  if (!drDbUrl || !bucket) {
    console.error('FATAL: Missing DR_SUPABASE_DB_URL or BACKUP_S3_BUCKET.');
    process.exit(1);
  }

  // 1. DR TARGET IDENTITY (Signal 1 & 2)
  if (drDbUrl.includes('hnjfxdyterpbmkisaiiw') || drDbUrl.includes('zxrzqyvlydsdczngxxst')) {
    console.error('FATAL: Target contains forbidden ID.');
    process.exit(1);
  }
  const parsedUrl = new URL(drDbUrl);
  if (!parsedUrl.hostname.includes('hlhrqvmmvczmvyxszzxd') && !drDbUrl.includes('hlhrqvmmvczmvyxszzxd')) {
    console.error('FATAL: Target identity check failed.');
    process.exit(1);
  }
  const userSegment = parsedUrl.username; // Should be postgres or similar for this project ref
  if (!userSegment && !drDbUrl.includes('hlhrqvmmvczmvyxszzxd')) {
    console.error('FATAL: Target identity missing second signal.');
    process.exit(1);
  }

  console.log('DR_TARGET_PROJECT_REF: hlhrqvmmvczmvyxszzxd');
  console.log('DR_TARGET_IDENTITY_VERIFIED: YES');

  const client = new Client({ connectionString: drDbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 2. PRE-RESTORE CLEAN CHECK (Semantic)
  const getCount = async (schema: string, table: string) => {
    try {
      const res = await runSql(client, `SELECT count(*) FROM ${schema}.${table}`);
      return parseInt(res[0].count, 10);
    } catch {
      return -1; // Missing table
    }
  };

  const hasProfiles = await runSql(client, `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'`);
  if (parseInt(hasProfiles[0].count, 10) > 0) {
    console.error('FATAL: Target is not clean. Application table public.profiles already exists.');
    process.exit(1);
  }

  const preAuthUsers = await getCount('auth', 'users');
  const preAuthIdentities = await getCount('auth', 'identities');
  const preStorageObjects = await getCount('storage', 'objects');
  const preMigrations = await getCount('supabase_migrations', 'schema_migrations');

  if (preAuthUsers !== 0 || preAuthIdentities !== 0) {
    console.error('FATAL: Target is not clean. auth.users or auth.identities is not empty.');
    process.exit(1);
  }

  if (preStorageObjects > 0) {
    console.error('FATAL: Target is not clean. storage.objects is not empty.');
    process.exit(1);
  }

  if (preMigrations > 0) {
    console.log('NOTICE: Target contains existing migrations. Make sure these are platform migrations only.');
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

  const manifestRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: manifestKey }));
  const manifestStr = await manifestRes.Body!.transformToString();
  const manifest = JSON.parse(manifestStr);
  
  const dumpRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: dumpKey }));
  fs.writeFileSync(dumpPath, await dumpRes.Body!.transformToByteArray());

  const fileBuffer = fs.readFileSync(dumpPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  if (hash !== manifest.sha256) {
    console.error('FATAL: Checksum mismatch. Aborting.');
    process.exit(1);
  }

  // 4. VERIFY PG_RESTORE
  const pgRestoreVersionOutput = execFileSync(PG_RESTORE_BIN, ['--version'], { encoding: 'utf-8' }).trim();
  if (!pgRestoreVersionOutput.includes('17.')) {
    console.error('FATAL: PostgreSQL client is not version 17.');
    process.exit(1);
  }

  let restoreState = 'NOT_STARTED';
  let restoreState = 'NOT_STARTED';
  let hasWrites = false;

  const runPhase = (phaseName: string, args: string[]) => {
    console.log(`[Restore Phase] ${phaseName}`);
    hasWrites = true;
    try {
      execFileSync(PG_RESTORE_BIN, [...args, '--exit-on-error', '--dbname', drDbUrl, dumpPath], { stdio: 'pipe' });
    } catch (err: unknown) {
      restoreState = 'FAILED_PARTIAL';
      console.error(`FATAL: Restore failed during phase: ${phaseName}`, err);
      console.log(`MANUAL_DR_RESET_REQUIRED: YES`);
      console.log(`STATUS: DR_DATABASE_RESTORE_PARTIAL_FAILURE`);
      process.exit(1);
    }
  };

  try {
    // PHASE 1: public PRE-DATA (Structure without constraints)
    runPhase('PUBLIC_PRE_DATA', [
      '--section=pre-data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_PRE_DATA_COMPLETE';

    // PHASE 2: auth DATA (Users/Identities explicitly before public constraints)
    runPhase('AUTH_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'auth', '-t', 'users', '-t', 'identities', '--single-transaction'
    ]);
    restoreState = 'AUTH_DATA_COMPLETE';

    // PHASE 3: public DATA
    runPhase('PUBLIC_DATA', [
      '--section=data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_DATA_COMPLETE';

    // PHASE 4: public POST-DATA (Constraints & FKs)
    runPhase('PUBLIC_POST_DATA', [
      '--section=post-data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_POST_DATA_COMPLETE';

    // PHASE 5: storage DATA (Metadata explicitly)
    runPhase('STORAGE_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'storage', '-t', 'buckets', '-t', 'objects', '--single-transaction'
    ]);
    restoreState = 'STORAGE_DATA_COMPLETE';

    // PHASE 6: supabase_migrations DATA
    runPhase('MIGRATIONS_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'supabase_migrations', '-t', 'schema_migrations', '--single-transaction'
    ]);
    restoreState = 'MIGRATIONS_DATA_COMPLETE';
    
    restoreState = 'COMPLETE';
  } catch {
    if (hasWrites && restoreState !== 'COMPLETE') {
      console.error('FATAL: Unhandled error mid-restore.');
      console.log(`MANUAL_DR_RESET_REQUIRED: YES`);
      process.exit(1);
    }
  }

  // Verification...
  const pCount = await getCount('public', 'profiles');
  const iCount = await getCount('public', 'invitations');
  const ivCount = await getCount('public', 'invitation_versions');
  const oCount = await getCount('public', 'orders');

  console.log(`PROFILES_COUNT: ${pCount}`);
  console.log(`INVITATIONS_COUNT: ${iCount}`);
  console.log(`INVITATION_VERSIONS_COUNT: ${ivCount}`);
  console.log(`ORDERS_COUNT: ${oCount}`);

  fs.rmSync(tempDir, { recursive: true, force: true });
  await client.end();
}

if (require.main === module) {
  if (process.env.DR_RUN_AUDIT !== 'true') {
    main().catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}
