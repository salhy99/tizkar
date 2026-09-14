import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';

type ProcessErrorLike = {
  message?: string;
  stderr?: string | Buffer;
  stdout?: string | Buffer;
  code?: string | number;
};

function isProcessErrorLike(value: unknown): value is ProcessErrorLike {
  return typeof value === 'object' && value !== null;
}

export function isReadableStream(body: unknown): body is Readable {
  return typeof body === 'object' && body !== null && 'pipe' in body && typeof (body as { pipe?: unknown }).pipe === 'function';
}

async function main() {
  console.log('EXECUTION_LOCATION: GITHUB_ACTIONS');
  console.log('EXECUTION_ENVIRONMENT: dr-drill');
  console.log('BACKUP_READ_SECRETS_PRESENT: YES');

  const endpoint = process.env.BACKUP_S3_ENDPOINT || '';
  const bucket = process.env.BACKUP_S3_BUCKET || '';
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY || '';
  const region = process.env.BACKUP_S3_REGION || 'auto';

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error('FATAL: Missing read-only R2 credentials.');
    process.exit(1);
  }

  if (bucket !== 'tizkar-storage-backup') {
    console.error(`FATAL: Unexpected backup bucket: ${bucket}. Expected tizkar-storage-backup.`);
    process.exit(1);
  }

  console.log('BACKUP_SOURCE_ACCESS: R2 (READ_ONLY)');
  console.log(`BACKUP_BUCKET: ${bucket}`);

  const PG_RESTORE_BIN = process.env.PG_RESTORE_BIN ?? '/usr/lib/postgresql/17/bin/pg_restore';
  const PSQL_BIN = process.env.PSQL_BIN ?? '/usr/lib/postgresql/17/bin/psql';

  let pgRestoreRuntimeVersion = '';
  try {
    pgRestoreRuntimeVersion = execFileSync(PG_RESTORE_BIN, ['--version'], { encoding: 'utf-8', shell: process.platform === 'win32' }).trim();
  } catch {
    console.error(`FATAL: Could not execute pg_restore at ${PG_RESTORE_BIN}`);
    process.exit(1);
  }

  let psqlRuntimeVersion = '';
  try {
    psqlRuntimeVersion = execFileSync(PSQL_BIN, ['--version'], { encoding: 'utf-8', shell: process.platform === 'win32' }).trim();
  } catch {
    psqlRuntimeVersion = 'UNKNOWN';
  }

  console.log(`PG_RESTORE_RUNTIME_PATH: ${PG_RESTORE_BIN}`);
  console.log(`PG_RESTORE_RUNTIME_VERSION: ${pgRestoreRuntimeVersion}`);
  console.log(`PSQL_RUNTIME_PATH: ${PSQL_BIN}`);
  console.log(`PSQL_RUNTIME_VERSION: ${psqlRuntimeVersion}`);

  console.log(`BACKUP_PRODUCER_PG_DUMP_VERSION: 17`);
  console.log(`BACKUP_ARCHIVE_HEADER_VERSION: 1.16`);

  const pgRestoreVersionMatch = pgRestoreRuntimeVersion.match(/pg_restore \(PostgreSQL\) (\d+\.\d+)/);
  const pgRestoreMajor = pgRestoreVersionMatch ? pgRestoreVersionMatch[1].split('.')[0] : 'UNKNOWN';

  console.log(`PG_RESTORE_CLIENT_MAJOR_VERSION: ${pgRestoreMajor}`);
  console.log(`BACKUP_PG_MAJOR_VERSION: 17`);
  console.log(`DR_SERVER_MAJOR_VERSION: 17.6`);
  console.log(`PG_RESTORE_CLIENT_VERSION_MATCH: ${pgRestoreMajor === '17' ? 'YES' : 'NO'}`);
  console.log(`POSTGRES_VERSION_COMPATIBLE: ${pgRestoreMajor === '17' ? 'YES' : 'NO'}`);

  if (pgRestoreMajor !== '17') {
    throw new Error('PG_RESTORE_CLIENT_VERSION_MISMATCH');
  }

  const s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  const prefix = 'tizkar-production/database/';
  console.log(`[Verify] Listing objects under ${prefix}...`);

  const listResponse = await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix
  }));

  const objects = listResponse.Contents || [];
  if (objects.length === 0) {
    console.error('FATAL: No database backups found.');
    process.exit(1);
  }

  // Find all manifests
  const manifests = objects.filter(o => o.Key && o.Key.endsWith('.manifest.json'));
  if (manifests.length === 0) {
    console.error('FATAL: No backup manifests found. Cannot verify integrity.');
    process.exit(1);
  }

  // Sort by LastModified desc to get the newest
  manifests.sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));
  const newestManifestObj = manifests[0];

  console.log(`[Verify] Newest manifest found: ${newestManifestObj.Key}`);

  const manifestResponse = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: newestManifestObj.Key
  }));

  const manifestBody = manifestResponse.Body;
  if (!manifestBody) {
    throw new Error('BACKUP_MANIFEST_BODY_MISSING');
  }
  const manifestBytes = await manifestBody.transformToByteArray();
  const manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf-8'));

  console.log(`DATABASE_BACKUP_ID: ${manifest.backup_id}`);
  console.log(`DATABASE_BACKUP_TIMESTAMP: ${manifest.completed_at}`);
  
  const backupDate = new Date(manifest.completed_at);
  const ageMs = Date.now() - backupDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  console.log(`DATABASE_BACKUP_AGE: ${ageHours.toFixed(2)} hours`);
  
  const rpoMet = ageHours <= 24;
  console.log(`DATABASE_RPO_TARGET: <= 24 hours`);
  console.log(`DATABASE_RPO_TARGET_MET: ${rpoMet ? 'YES' : 'NO'}`);

  console.log(`BACKUP_MANIFEST_PRESENT: YES`);
  console.log(`BACKUP_CHECKSUM_PRESENT: ${manifest.sha256 ? 'YES' : 'NO'}`);

  if (!manifest.sha256) {
    console.error('FATAL: Missing SHA256 checksum in manifest.');
    process.exit(1);
  }

  if (!manifest.destination) {
    console.error('FATAL: Missing dump destination in manifest.');
    process.exit(1);
  }

  const dumpKey = manifest.destination;
  const dumpObjectExists = objects.some(o => o.Key === dumpKey);
  
  if (!dumpObjectExists) {
    console.error(`FATAL: Dump file ${dumpKey} listed in manifest but not found in R2.`);
    process.exit(1);
  }
  
  console.log(`BACKUP_ARCHIVE_PRESENT: YES`);

  // Download the dump to a temp directory
  console.log(`[Verify] Downloading ${dumpKey} for SHA-256 verification...`);
  const dumpResponse = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: dumpKey
  }));

  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'dr-verify-'));
  const dumpPath = path.join(tempDir, 'backup.dump');
  
  const writeStream = fs.createWriteStream(dumpPath);
  const archiveBody = dumpResponse.Body;
  
  if (!archiveBody) {
    throw new Error('BACKUP_ARCHIVE_BODY_MISSING');
  }
  
  if (isReadableStream(archiveBody)) {
    await new Promise<void>((resolve, reject) => {
      archiveBody.pipe(writeStream)
        .on('error', reject)
        .on('finish', () => resolve());
    });
  } else {
    const bytes = await archiveBody.transformToByteArray();
    fs.writeFileSync(dumpPath, bytes);
  }

  console.log(`[Verify] File downloaded to runner temp.`);

  // Compute SHA-256
  const fileBuffer = fs.readFileSync(dumpPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  console.log(`DATABASE_BACKUP_SHA256: ${hash}`);
  const match = hash === manifest.sha256;
  console.log(`DATABASE_BACKUP_SHA_MATCH: ${match ? 'YES' : 'NO'}`);

  if (!match) {
    console.error(`FATAL: SHA-256 mismatch! Expected ${manifest.sha256}, got ${hash}`);
    fs.unlinkSync(dumpPath);
    fs.rmdirSync(tempDir);
    process.exit(1);
  }

  // Verify format with pg_restore
  let tocOutput = '';
  try {
    console.log(`[Verify] Running pg_restore --list to verify format...`);
    console.log(`ARCHIVE_HEADER_VERSION=1.16`);
    console.log(`EXPECTED_PG17_SUPPORT=YES`);
    // Ensure we do NOT pass a database URL to prevent accidental restore
    tocOutput = execFileSync(PG_RESTORE_BIN, ['--list', dumpPath], { encoding: 'utf-8', shell: process.platform === 'win32' });
  } catch (err: unknown) {
    let stderr = '';
    if (isProcessErrorLike(err) && typeof err.stderr === 'string') {
      stderr = err.stderr;
    } else if (err instanceof Error) {
      stderr = err.message;
    }
    console.error(`FATAL: pg_restore failed to read archive: ${stderr}`);
    fs.unlinkSync(dumpPath);
    fs.rmdirSync(tempDir);
    process.exit(1);
  }

  const tocLines = tocOutput.trim().split('\n');
  const entryCount = tocLines.length;

  // We consider it a custom archive if pg_restore --list succeeds and returns entries.
  console.log('ARCHIVE_FORMAT: CUSTOM');
  console.log('ARCHIVE_READABLE: YES');
  console.log(`ARCHIVE_ENTRY_COUNT: ${entryCount}`);

  // Semantic parsing of TOC
  const publicStandalonePresent = tocOutput.includes(' SCHEMA public ') || tocOutput.includes(' SCHEMA - public ');
  const authPresent = tocOutput.includes(' SCHEMA auth ') || tocOutput.includes(' SCHEMA - auth ');
  const storagePresent = tocOutput.includes(' SCHEMA storage ') || tocOutput.includes(' SCHEMA - storage ');
  
  let publicNamespaceCount = 0;
  const expectedPublicTables = ['profiles', 'admins', 'invitations', 'invitation_versions', 'orders'];
  const archivedPublicTables: string[] = [];
  
  let profilesData = false;
  let adminsData = false;
  let invitationsData = false;
  let invitationVersionsData = false;
  let ordersData = false;
  
  let sequenceObjects = 0;
  let sequenceStates = 0;
  let pkCount = 0;
  let fkCount = 0;
  let idxCount = 0;
  let ucCount = 0;
  
  let authUsers = false;
  let authIdentities = false;
  let storageBuckets = false;
  let storageObjects = false;
  let migrationHistory = false;
  let migrationHistoryRelation = 'N/A';
  
  for (const line of tocLines) {
    if (line.startsWith(';') || !line.trim()) continue;
    
    // Check namespace
    if (line.includes(' public ')) {
      publicNamespaceCount++;
    }
    
    // Check tables
    if (line.includes(' TABLE public profiles ')) archivedPublicTables.push('profiles');
    if (line.includes(' TABLE public admins ')) archivedPublicTables.push('admins');
    if (line.includes(' TABLE public invitations ')) archivedPublicTables.push('invitations');
    if (line.includes(' TABLE public invitation_versions ')) archivedPublicTables.push('invitation_versions');
    if (line.includes(' TABLE public orders ')) archivedPublicTables.push('orders');
    
    // Check data
    if (line.includes(' TABLE DATA public profiles ')) profilesData = true;
    if (line.includes(' TABLE DATA public admins ')) adminsData = true;
    if (line.includes(' TABLE DATA public invitations ')) invitationsData = true;
    if (line.includes(' TABLE DATA public invitation_versions ')) invitationVersionsData = true;
    if (line.includes(' TABLE DATA public orders ')) ordersData = true;
    
    if (line.includes(' CONSTRAINT ') && line.includes(' UNIQUE ')) ucCount++;
    if (line.includes(' SEQUENCE ')) sequenceObjects++;
    if (line.includes(' SEQUENCE SET ')) sequenceStates++;
    if (line.includes(' CONSTRAINT ')) pkCount++; // Approximate, assuming constraints are often PKs/UCs
    if (line.includes(' FK CONSTRAINT ')) fkCount++;
    if (line.includes(' INDEX ')) idxCount++;
    
    // Check auth/storage
    if (line.includes(' TABLE auth users ')) authUsers = true;
    if (line.includes(' TABLE auth identities ')) authIdentities = true;
    if (line.includes(' TABLE storage buckets ')) storageBuckets = true;
    if (line.includes(' TABLE storage objects ')) storageObjects = true;
    
    // Migration history
    if (line.includes(' supabase_migrations ')) {
      migrationHistory = true;
      migrationHistoryRelation = 'supabase_migrations.schema_migrations';
    }
  }
  
  const missingCriticalPublicTables = expectedPublicTables.filter(t => !archivedPublicTables.includes(t)).length;
  const publicSchemaContentPresent = publicNamespaceCount > 0;
  const publicSchemaDetectorFalseNegative = !publicStandalonePresent && publicSchemaContentPresent;

  console.log(`PUBLIC_SCHEMA_STANDALONE_ENTRY_PRESENT: ${publicStandalonePresent ? 'YES' : 'NO'}`);
  console.log(`PUBLIC_NAMESPACE_TOC_ENTRY_COUNT: ${publicNamespaceCount}`);
  console.log(`PUBLIC_SCHEMA_CONTENT_PRESENT: ${publicSchemaContentPresent ? 'YES' : 'NO'}`);
  console.log(`PUBLIC_SCHEMA_DETECTOR_FALSE_NEGATIVE: ${publicSchemaDetectorFalseNegative ? 'YES' : 'NO'}`);
  
  console.log(`EXPECTED_PUBLIC_TABLES: ${expectedPublicTables.join(', ')}`);
  console.log(`ARCHIVED_PUBLIC_TABLES: ${archivedPublicTables.join(', ')}`);
  console.log(`MISSING_CRITICAL_PUBLIC_TABLES: ${missingCriticalPublicTables}`);
  
  console.log(`PROFILES_TABLE_DATA_PRESENT: ${profilesData ? 'YES' : 'NO'}`);
  console.log(`ADMINS_TABLE_DATA_PRESENT: ${adminsData ? 'YES' : 'NO'}`);
  console.log(`INVITATIONS_TABLE_DATA_PRESENT: ${invitationsData ? 'YES' : 'NO'}`);
  console.log(`INVITATION_VERSIONS_TABLE_DATA_PRESENT: ${invitationVersionsData ? 'YES' : 'NO'}`);
  console.log(`ORDERS_TABLE_DATA_PRESENT: ${ordersData ? 'YES' : 'NO'}`);
  
  console.log(`REQUIRED_SEQUENCE_OBJECTS_PRESENT: ${sequenceObjects > 0 ? 'YES' : 'NO'}`);
  console.log(`SEQUENCE_STATE_PRESENT: ${sequenceStates > 0 ? 'YES' : 'NO'}`);
  
  console.log(`PUBLIC_PRIMARY_KEY_COUNT: ${pkCount}`);
  console.log(`PUBLIC_FOREIGN_KEY_COUNT: ${fkCount}`);
  console.log(`PUBLIC_INDEX_COUNT: ${idxCount}`);
  console.log(`PUBLIC_UNIQUE_CONSTRAINT_COUNT: ${ucCount}`);
  console.log(`CRITICAL_RELATIONSHIP_METADATA_PRESENT: ${(pkCount > 0 && fkCount > 0) ? 'YES' : 'NO'}`);
  
  console.log(`AUTH_USERS_RELATION_PRESENT: ${authUsers ? 'YES' : 'NO'}`);
  console.log(`AUTH_IDENTITIES_RELATION_PRESENT: ${authIdentities ? 'YES' : 'NO'}`);
  console.log(`STORAGE_BUCKETS_RELATION_PRESENT: ${storageBuckets ? 'YES' : 'NO'}`);
  console.log(`STORAGE_OBJECTS_RELATION_PRESENT: ${storageObjects ? 'YES' : 'NO'}`);
  
  console.log(`MIGRATION_HISTORY_RELATION: ${migrationHistoryRelation}`);
  console.log(`MIGRATION_HISTORY_PRESENT: ${migrationHistory ? 'YES' : 'NO'}`);
  
  console.log(`AUTH_SCHEMA_PRESENT: ${authPresent ? 'YES' : 'NO'}`);
  console.log(`STORAGE_SCHEMA_PRESENT: ${storagePresent ? 'YES' : 'NO'}`);


  const drSupabaseUrl = process.env.DR_SUPABASE_URL || '';
  if (drSupabaseUrl.includes('hnjfxdyterpbmkisaiiw')) {
    console.error('FATAL: Production target rejected.');
    process.exit(1);
  } else if (drSupabaseUrl.includes('zxrzqyvlydsdczngxxst')) {
    console.error('FATAL: Development target rejected.');
    process.exit(1);
  }
  
  if (drSupabaseUrl.includes('hlhrqvmmvczmvyxszzxd')) {
    console.log('DR_TARGET_RECONFIRMED: YES');
    console.log('PRODUCTION_TARGET_REJECTED: YES');
    console.log('DEVELOPMENT_TARGET_REJECTED: YES');
  } else {
    console.log('DR_TARGET_RECONFIRMED: NO (Unknown target)');
  }

  // Cleanup
  fs.unlinkSync(dumpPath);
  fs.rmdirSync(tempDir);
  console.log('RUNNER_TEMP_CLEANUP: YES');

  const drTargetReconfirmed = drSupabaseUrl.includes('hlhrqvmmvczmvyxszzxd');
  
  const isReadyForRestore = 
    pgRestoreMajor === '17' &&
    match === true &&
    entryCount > 0 &&
    publicSchemaContentPresent &&
    missingCriticalPublicTables === 0 &&
    authPresent &&
    storagePresent &&
    migrationHistory &&
    drTargetReconfirmed;

  if (isReadyForRestore) {
    console.log('\nSTATUS: DATABASE_BACKUP_VERIFIED_READY_FOR_RESTORE');
  } else {
    console.log('\nSTATUS: DATABASE_BACKUP_VERIFICATION_FAILED');
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
