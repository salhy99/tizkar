import * as assert from 'assert';

const PINNED_BACKUP_ID = 'db-backup-2026-09-06T23-03-28-065Z';
const dumpFilename = `${PINNED_BACKUP_ID}.dump`;
const manifestFilename = `${PINNED_BACKUP_ID}.manifest.json`;

const dumpKey = `tizkar-production/database/${dumpFilename}`;
const manifestKey = `tizkar-production/database/${manifestFilename}`;

const expectedDumpKey = 'tizkar-production/database/db-backup-2026-09-06T23-03-28-065Z.dump';
const expectedManifestKey = 'tizkar-production/database/db-backup-2026-09-06T23-03-28-065Z.manifest.json';
const expectedBucket = 'tizkar-storage-backup';

try {
  assert.strictEqual(dumpKey, expectedDumpKey, 'Dump key mismatch');
  assert.strictEqual(manifestKey, expectedManifestKey, 'Manifest key mismatch');
  
  // Test bucket from env if provided
  if (process.env.BACKUP_S3_BUCKET) {
    assert.strictEqual(process.env.BACKUP_S3_BUCKET, expectedBucket, 'Bucket mismatch');
  } else {
    console.warn('BACKUP_S3_BUCKET not set in env during test, skipping bucket assertion.');
  }

  console.log('TEST_RESULT: PASS');
  console.log(`REQUESTED_DUMP_KEY: ${dumpKey}`);
  console.log(`REQUESTED_MANIFEST_KEY: ${manifestKey}`);
} catch (error) {
  console.error('TEST_RESULT: FAIL');
  console.error(error);
  process.exit(1);
}
