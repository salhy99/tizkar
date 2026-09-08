import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PINNED_BACKUP_ID = 'db-backup-2026-09-06T23-03-28-065Z';
const EXPECTED_BUCKET = 'tizkar-storage-backup';
const DUMP_KEY = `tizkar-production/database/${PINNED_BACKUP_ID}.dump`;
const MANIFEST_KEY = `tizkar-production/database/${PINNED_BACKUP_ID}.manifest.json`;

const endpoint = process.env.BACKUP_S3_ENDPOINT || '';
const bucket = process.env.BACKUP_S3_BUCKET || '';
const accessKey = process.env.BACKUP_S3_ACCESS_KEY_ID || '';
const secretKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY || '';

console.log('=== R2 DIAGNOSTIC MODE ===');

if (!endpoint || !bucket || !accessKey || !secretKey) {
  console.error('FATAL: Missing one or more BACKUP_S3_* environment variables.');
  process.exit(1);
}

// 1. Endpoint Normalization Check
const parsedEndpoint = new URL(endpoint);
const isR2 = parsedEndpoint.hostname.endsWith('.r2.cloudflarestorage.com');
const isAccountLevel = parsedEndpoint.pathname === '/';
const hasTrailingSlash = endpoint.endsWith('/');

console.log(`\n[Configuration Analysis]`);
console.log(`Endpoint R2 Format: ${isR2 ? 'YES' : 'NO'}`);
console.log(`Endpoint is Account-Level (No Path): ${isAccountLevel ? 'YES' : 'NO'}`);
console.log(`Endpoint has Trailing Slash: ${hasTrailingSlash ? 'YES' : 'NO'}`);
console.log(`Configured Region: auto (Required for R2)`);
console.log(`Configured Bucket matches expected: ${bucket === EXPECTED_BUCKET ? 'YES' : 'NO (Got ' + bucket + ')'}`);

// In AWS SDK v3, forcePathStyle: false (default) uses virtual-hosted style (bucket.endpoint.com).
// Cloudflare R2 supports virtual-hosted style now, but we'll test with standard config matching backup script.
const s3Client = new S3Client({
  endpoint: endpoint,
  region: 'auto',
  // forcePathStyle is NOT set here because database-backup.ts did not set it.
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  }
});

async function describeError(error: unknown): Promise<string> {
  const err = (error || {}) as Record<string, unknown>;
  const code = err.name || err.Code || 'UnknownError';
  const metadata = err.$metadata as Record<string, unknown> | undefined;
  const status = metadata?.httpStatusCode || 'N/A';
  
  if (status === 403 || code === 'AccessDenied') {
    return `AccessDenied (${status}): Credentials lack permission for this operation on the target bucket. Check if the token has read access to '${bucket}' in the correct Cloudflare account.`;
  }
  if (status === 404 || code === 'NoSuchBucket' || code === 'NotFound') {
    // A 404 on HeadObject is often just 'NotFound', whereas on ListObjects it might be NoSuchBucket.
    return `${code} (${status}): Object or bucket not found.`;
  }
  if (status === 400) {
    return `BadRequest (${status}): Often implies region mismatch or malformed endpoint addressing (e.g., virtual-host vs path-style bug).`;
  }
  return `${code} (${status})`;
}

async function runDiagnostic() {
  console.log(`\n[Checking Dump] ${DUMP_KEY}`);
  let dumpFound = false;
  try {
    const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: DUMP_KEY }));
    console.log(`DUMP_HEAD_STATUS: 200 OK`);
    console.log(`DUMP_EXISTS: YES`);
    console.log(`DUMP_SIZE: ${head.ContentLength} bytes`);
    dumpFound = true;
  } catch (error: unknown) {
    const desc = await describeError(error);
    console.log(`DUMP_HEAD_STATUS: ${desc}`);
    console.log(`DUMP_EXISTS: NO`);
  }

  console.log(`\n[Checking Manifest] ${MANIFEST_KEY}`);
  let manifestFound = false;
  try {
    const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: MANIFEST_KEY }));
    console.log(`MANIFEST_HEAD_STATUS: 200 OK`);
    console.log(`MANIFEST_EXISTS: YES`);
    console.log(`MANIFEST_SIZE: ${head.ContentLength} bytes`);
    manifestFound = true;
  } catch (error: unknown) {
    const desc = await describeError(error);
    console.log(`MANIFEST_HEAD_STATUS: ${desc}`);
    console.log(`MANIFEST_EXISTS: NO`);
  }

  if (!dumpFound || !manifestFound) {
    console.log(`\n[Diagnostics] Attempting bounded ListObjectsV2 on bucket root to distinguish NoSuchBucket from NoSuchKey...`);
    try {
      const listData = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'tizkar-production/database/',
        MaxKeys: 5
      }));
      
      console.log(`LIST_STATUS: 200 OK`);
      console.log(`LIST_EXISTS: Bucket exists and allows listing.`);
      if (listData.Contents && listData.Contents.length > 0) {
        console.log(`Found ${listData.Contents.length} objects under backup prefix. First few:`);
        listData.Contents.forEach(obj => {
          console.log(` - Key: ${obj.Key} (Size: ${obj.Size})`);
        });
      } else {
        console.log(`No objects found under prefix. The bucket exists in the authenticated account, but it is empty or missing these specific backups.`);
        console.log(`-> POSSIBLE MISMATCH: The Access Key used here might point to a DIFFERENT Cloudflare account that happens to have an empty '${bucket}' bucket.`);
      }
    } catch (listErr: unknown) {
      const desc = await describeError(listErr);
      console.log(`LIST_STATUS: ${desc}`);
      if (desc.includes('NoSuchBucket')) {
        console.log(`-> MISMATCH CONFIRMED: The bucket '${bucket}' does not exist in the Cloudflare account associated with this Access Key.`);
      } else if (desc.includes('AccessDenied')) {
        console.log(`-> MISMATCH POSSIBLE: The token does not have List permissions, or is restricted to a specific path/IP.`);
      }
    }
  }
}

runDiagnostic().catch(err => {
  console.error('Diagnostic crashed:', err.name || err.message);
  process.exit(1);
});
