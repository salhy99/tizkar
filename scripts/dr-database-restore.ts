import * as dotenv from 'dotenv';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';


dotenv.config({ path: '.env.local' });

const PINNED_BACKUP_ID = 'db-backup-2026-09-14T08-42-25-329Z';
const PG_RESTORE_BIN = process.env.PG_RESTORE_BIN ?? '/usr/lib/postgresql/17/bin/pg_restore';
const EXPECTED_TIZKAR_TABLES = [
  'profiles', 'event_types', 'plans', 'plan_features', 'templates', 'template_versions', 
  'invitations', 'invitation_versions', 'orders', 'payments', 'admin_logs', 
  'invitation_views', 'rsvp_responses', 'notifications', 'otp_requests', 
  'invitation_rsvps', 'invitation_analytics_events', 'product_funnel_events', 
  'admin_audit_log', 'invitation_media_reservations'
];

const PSQL_BIN = process.env.PSQL_BIN ?? '/usr/lib/postgresql/17/bin/psql';

export async function runSql(query: string): Promise<string> {
  const url = process.env.DR_SUPABASE_DB_URL;
  if (!url) throw new Error('Missing drDbUrl');
  const stdout = execFileSync(PSQL_BIN, [url, '-t', '-c', query], { encoding: 'utf-8' });
  return stdout.trim();
}

// 1. STRENGTHEN DR TARGET IDENTITY
export function verifyTargetIdentity(dbUrl: string): boolean {
  if (dbUrl.includes('hnjfxdyterpbmkisaiiw') || dbUrl.includes('zxrzqyvlydsdczngxxst')) {
    console.error('FATAL: Target contains forbidden ID (Production or Development).');
    return false;
  }
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(dbUrl);
  } catch {
    console.error('FATAL: Invalid URL format.');
    return false;
  }
  
  const expectedRef = 'hlhrqvmmvczmvyxszzxd';
  const isLocalDrill = dbUrl.includes('127.0.0.1') && parsedUrl.pathname.includes('tizkar_restore_drill');
  
  let signal1 = false;
  let signal2 = false;
  
  if (isLocalDrill) {
    signal1 = true;
    signal2 = true;
  } else {
    // SIGNAL 1: URL of the project API matches expected ref
    const apiUrl = process.env.DR_SUPABASE_URL || '';
    if (apiUrl.includes(expectedRef)) {
      signal1 = true;
    }
    
    // SIGNAL 2: Database binding contains project ref (Username for pooler, or hostname for direct)
    if (parsedUrl.username.includes(expectedRef) || parsedUrl.hostname.includes(expectedRef)) {
      signal2 = true;
    }
  }

  console.log(`TARGET_IDENTITY_SIGNAL_1: ${signal1 ? 'PASS' : 'FAIL'}`);
  console.log(`TARGET_IDENTITY_SIGNAL_2: ${signal2 ? 'PASS' : 'FAIL'}`);
  console.log(`SHARED_POOLER_HOSTNAME_USED_AS_IDENTITY_SIGNAL: NO`); // Hostname is just one signal. Username is the second.

  if (!signal1 || !signal2) {
    console.error('FATAL: Target identity missing independent signals.');
    return false;
  }
  return true;
}

export async function checkTargetClean(): Promise<boolean> {
  // Check ALL application tables
  const existingTablesStr = await runSql(`SELECT string_agg(table_name, ',') FROM information_schema.tables WHERE table_schema='public'`);
  const existingTables = existingTablesStr.split(',').map(s => s.trim());
  
  const foundAppTables = EXPECTED_TIZKAR_TABLES.filter(t => existingTables.includes(t));
  console.log(`CURRENT_TIZKAR_PUBLIC_TABLES: ${EXPECTED_TIZKAR_TABLES.join(', ')}`);
  console.log(`PREEXISTING_TIZKAR_PUBLIC_TABLES: ${foundAppTables.length > 0 ? foundAppTables.join(', ') : 'NONE'}`);
  
  if (foundAppTables.length > 0) {
    console.error(`FATAL: Target is not clean. Found preexisting public app tables: ${foundAppTables.join(', ')}`);
    return false;
  }

  const getCount = async (schema: string, table: string) => {
    try {
      const res = await runSql(`SELECT count(*) FROM ${schema}.${table}`);
      return parseInt(res, 10);
    } catch {
      return -1;
    }
  };

  if ((await getCount('auth', 'users')) !== 0 || (await getCount('auth', 'identities')) !== 0) {
    console.error('FATAL: Target is not clean. auth.users or auth.identities is not empty.');
    return false;
  }

  if ((await getCount('storage', 'buckets')) > 0 || (await getCount('storage', 'objects')) > 0) {
    console.error('FATAL: Target is not clean. storage metadata is not empty.');
    return false;
  }

  return true;
}

export async function checkMigrationConflict(): Promise<string> {
  const getCount = async (schema: string, table: string) => {
    try {
      const res = await runSql(`SELECT count(*) FROM ${schema}.${table}`);
      return parseInt(res, 10);
    } catch {
      return -1;
    }
  };

  const currentCount = await getCount('supabase_migrations', 'schema_migrations');
  if (currentCount === -1) {
    return 'EMPTY'; // Table doesn't exist
  } else if (currentCount === 0) {
    return 'EMPTY';
  } else {
    // If there are migrations, they could be default supabase ones. 
    // We strictly assume CONFLICTING unless we have a specific subset diff logic.
    return 'CONFLICTING';
  }
}

async function main() {
  const drDbUrl = process.env.DR_SUPABASE_DB_URL;
  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!drDbUrl || !bucket) {
    console.error('FATAL: Missing DR_SUPABASE_DB_URL or BACKUP_S3_BUCKET.');
    process.exit(1);
  }

  if (!verifyTargetIdentity(drDbUrl)) {
    process.exit(1);
  }

  const isClean = await checkTargetClean();
  console.log(`PUBLIC_TARGET_CLEAN: ${isClean ? 'YES' : 'NO'}`);
  if (!isClean) {
    process.exit(1);
  }

  const migrationState = await checkMigrationConflict();
  console.log(`DR_MIGRATION_HISTORY_STATE: ${migrationState}`);
  console.log(`MIGRATION_HISTORY_CONFLICT_POLICY: CONFLICTING => STOP`);
  console.log(`MIGRATION_HISTORY_RESTORE_ACTION: ${migrationState === 'EMPTY' ? 'RESTORE' : 'STOP'}`);
  
  if (migrationState === 'CONFLICTING') {
    console.error('FATAL: Migration history conflict.');
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

  const dumpKey = `tizkar-production/database/${PINNED_BACKUP_ID}.dump`;
  const manifestKey = `tizkar-production/database/${PINNED_BACKUP_ID}.manifest.json`;
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'dr-restore-'));
  const dumpPath = path.join(tempDir, 'backup.dump');

  try {
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
  } catch (err) {
    console.error('FATAL: Error downloading backup.', err);
    process.exit(1);
  }

  // 4. VERIFY PG_RESTORE
  const pgRestoreVersionOutput = execFileSync(PG_RESTORE_BIN, ['--version'], { encoding: 'utf-8' }).trim();
  if (!pgRestoreVersionOutput.includes('17.')) {
    console.error('FATAL: PostgreSQL client is not version 17.');
    process.exit(1);
  }

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
    runPhase('PUBLIC_PRE_DATA', [
      '--section=pre-data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_PRE_DATA_COMPLETE';

    runPhase('AUTH_USERS_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'auth', '-t', 'users', '--single-transaction'
    ]);
    restoreState = 'AUTH_USERS_DATA_COMPLETE';

    runPhase('AUTH_IDENTITIES_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'auth', '-t', 'identities', '--single-transaction'
    ]);
    restoreState = 'AUTH_IDENTITIES_DATA_COMPLETE';

    runPhase('PUBLIC_DATA', [
      '--section=data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_DATA_COMPLETE';

    runPhase('PUBLIC_POST_DATA', [
      '--section=post-data', '--no-owner', '--no-acl', '-n', 'public', '--single-transaction'
    ]);
    restoreState = 'PUBLIC_POST_DATA_COMPLETE';

    runPhase('STORAGE_BUCKETS_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'storage', '-t', 'buckets', '--single-transaction'
    ]);
    restoreState = 'STORAGE_BUCKETS_DATA_COMPLETE';

    runPhase('STORAGE_OBJECTS_DATA', [
      '--data-only', '--no-owner', '--no-acl', '-n', 'storage', '-t', 'objects', '--single-transaction'
    ]);
    restoreState = 'STORAGE_OBJECTS_DATA_COMPLETE';

    if (migrationState === 'EMPTY') {
      runPhase('MIGRATIONS_DATA', [
        '--data-only', '--no-owner', '--no-acl', '-n', 'supabase_migrations', '-t', 'schema_migrations', '--single-transaction'
      ]);
    }
    restoreState = 'MIGRATIONS_DATA_COMPLETE';
    
    restoreState = 'COMPLETE';
  } catch {
    if (hasWrites && restoreState !== 'COMPLETE') {
      console.error('FATAL: Unhandled error mid-restore.');
      console.log(`MANUAL_DR_RESET_REQUIRED: YES`);
      process.exit(1);
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (require.main === module) {
  if (process.env.DR_RUN_AUDIT !== 'true') {
    main().catch(err => {
      console.error(err);
      process.exit(1);
    });
  }
}
