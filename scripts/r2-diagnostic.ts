import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PINNED_BACKUP_ID = 'db-backup-2026-09-06T23-03-28-065Z';
const EXPECTED_BUCKET = 'tizkar-storage-backup';
const DUMP_KEY = `tizkar-production/database/${PINNED_BACKUP_ID}.dump`;
const MANIFEST_KEY = `tizkar-production/database/${PINNED_BACKUP_ID}.manifest.json`;

import * as crypto from 'crypto';

const endpoint = process.env.BACKUP_S3_ENDPOINT || '';
const bucket = process.env.BACKUP_S3_BUCKET || '';
const accessKey = process.env.BACKUP_S3_ACCESS_KEY_ID || '';

console.log('=== R2 DIAGNOSTIC MODE ===');

// Safely fingerprint endpoint (e.g., https://12345.r2.cloudflarestorage.com -> https://***.r2.cloudflarestorage.com)
const endpointFingerprint = endpoint.replace(/https:\/\/[^\.]+\./, 'https://***.');
console.log(`ENDPOINT_FINGERPRINT: ${endpointFingerprint}`);

const endpointFormat = endpointFingerprint.includes('.r2.cloudflarestorage.com') ? 'YES (R2 format)' : 'UNKNOWN';
const hasPathStyle = (new URL(endpoint).pathname !== '/') ? 'NO (Contains path, likely bucket)' : 'YES';
console.log(`ENDPOINT_MATCH: ${endpointFormat}`);
console.log(`ADDRESSING_STYLE: ${hasPathStyle}`);

const bucketMatch = bucket === EXPECTED_BUCKET;
console.log(`BUCKET_MATCH: ${bucketMatch ? 'YES' : 'NO (Got: ' + bucket + ')'}`);

// Hash comparison for Account Identifier / Endpoint
const prodEndpointHash = process.env.PROD_ENDPOINT_HASH;
const prodAkHash = process.env.PROD_AK_HASH;
const localEndpointHash = crypto.createHash('sha256').update(endpoint).digest('hex');
const localAkHash = crypto.createHash('sha256').update(accessKey).digest('hex');

if (prodEndpointHash === localEndpointHash && prodAkHash === localAkHash) {
  console.log(`ACCOUNT_ID_MATCH: YES`);
} else {
  console.log(`ACCOUNT_ID_MATCH: NO (Restore-drill identity does NOT match Production)`);
}

if (!bucket) {
  console.error('FATAL: BACKUP_S3_BUCKET is not set.');
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: endpoint,
  region: 'auto', // R2 requires 'auto' if region is unset
  credentials: {
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!
  }
});

async function checkObject(key: string, label: string) {
  try {
    const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`${label}_HEAD_STATUS: 200 OK`);
    console.log(`${label}_EXISTS: YES`);
    console.log(`${label}_SIZE: ${head.ContentLength} bytes`);
    if (head.ETag) console.log(`${label}_ETAG: ${head.ETag}`);
    return true;
  } catch (error: any) {
    console.log(`${label}_HEAD_STATUS: ${error.$metadata?.httpStatusCode || error.name}`);
    console.log(`${label}_EXISTS: NO`);
    console.log(`${label}_SIZE: N/A`);
    return false;
  }
}

async function runDiagnostic() {
  console.log(`\n[Checking Dump] ${DUMP_KEY}`);
  const dumpExists = await checkObject(DUMP_KEY, 'DUMP');

  console.log(`\n[Checking Manifest] ${MANIFEST_KEY}`);
  const manifestExists = await checkObject(MANIFEST_KEY, 'MANIFEST');

  if (!dumpExists || !manifestExists) {
    console.log(`\n[Listing Objects] Object(s) not found. Attempting a bounded prefix list...`);
    const prefix = `tizkar-production/database/`;
    try {
      const listData = await s3Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 10
      }));
      console.log(`List Status: 200 OK`);
      if (listData.Contents && listData.Contents.length > 0) {
        console.log(`Found ${listData.Contents.length} objects under prefix '${prefix}':`);
        listData.Contents.forEach(obj => {
          // Log only safe info to prove presence
          console.log(` - Key: ${obj.Key} (Size: ${obj.Size})`);
        });
      } else {
        console.log(`No objects found under prefix '${prefix}'.`);
      }
    } catch (listErr: any) {
      console.log(`List Error: Could not list objects (${listErr.name}). Note: Credentials may lack list permissions.`);
    }
    console.log('\nACTUAL_KEY_MISMATCH: PENDING REVIEW (Review list output)');
  } else {
    console.log('\nACTUAL_KEY_MISMATCH: NO (Keys perfectly matched)');
  }

  console.log('\nROOT_CAUSE: PENDING GITHUB EXECUTION (Review workflow logs)');
}

runDiagnostic().catch(err => {
  console.error('Diagnostic crashed:', err.name);
  process.exit(1);
});
