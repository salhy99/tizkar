import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { verifyLegacyObject } from '../src/lib/storage/backup/snapshot/drill-verifier';

const MAX_OBJECTS = 5;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_OBJECT_SIZE = 10 * 1024 * 1024; // 10 MB

const endpoint = process.env.RESTORE_S3_ENDPOINT;
const region = process.env.RESTORE_S3_REGION || 'auto';
const accessKeyId = process.env.RESTORE_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.RESTORE_S3_SECRET_ACCESS_KEY;
const bucketName = process.env.RESTORE_S3_BUCKET;

// Hard-crash if any Production credentials are leaked into the restore environment
if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VERCEL_TOKEN) {
  console.error('[RestoreDrill] FATAL: Forbidden production credentials detected in restore environment.');
  process.exit(1);
}

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('[RestoreDrill] FATAL: Missing R2 read-only credentials in environment.');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey }
});

const RESTORE_DIR = path.join(process.cwd(), '.storage_restore');

async function cleanup() {
  console.log(`[RestoreDrill] Cleaning up disposable directory.`);
  if (existsSync(RESTORE_DIR)) {
    await fsPromises.rm(RESTORE_DIR, { recursive: true, force: true });
  }
}

async function runDrill() {
  console.log(`[RestoreDrill] Starting Legacy Mirror Restore Drill (Bounded)`);
  
  try {
    await cleanup();
  } catch (err) {
    console.error('[RestoreDrill] CLEANUP_FAILED (initial):', err);
    process.exit(1);
  }
  
  mkdirSync(RESTORE_DIR, { recursive: true });

  let totalBytes = 0;
  let objectsProcessed = 0;
  let hasFailure = false;

  try {
    const listResponse = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 50
    }));

    const objects = listResponse.Contents || [];
    if (objects.length === 0) {
      console.log(`[RestoreDrill] NO_APPROVED_SAMPLE: No objects found in bucket.`);
      return;
    }

    const selectedKeys: { key: string, size: number }[] = [];
    let selectedBytes = 0;

    for (const obj of objects) {
      if (!obj.Key || typeof obj.Size !== 'number') continue;
      
      if (obj.Size > MAX_OBJECT_SIZE) {
        // Exclude object key from logs
        continue;
      }

      // Safe sample selection constraint: MUST be synthetic
      const isSynthetic = obj.Key.startsWith('synthetic/') || obj.Key.startsWith('test/') || obj.Key.includes('test-fixture');
      if (!isSynthetic) {
        continue;
      }
      
      if (selectedKeys.length >= MAX_OBJECTS) break;
      if (selectedBytes + obj.Size > MAX_TOTAL_BYTES) break;

      selectedKeys.push({ key: obj.Key, size: obj.Size });
      selectedBytes += obj.Size;
    }

    if (selectedKeys.length === 0) {
      console.log(`[RestoreDrill] NO_APPROVED_SAMPLE: No approved synthetic/test objects found in the selection batch.`);
      return;
    }

    console.log(`[RestoreDrill] Selected ${selectedKeys.length} synthetic object(s) totaling ${selectedBytes} bytes.`);

    for (const { key, size } of selectedKeys) {
      objectsProcessed++;
      console.log(`\n[RestoreDrill] Processing synthetic object [${objectsProcessed}/${selectedKeys.length}]`);

      const result = await verifyLegacyObject(s3, bucketName!, key, size, RESTORE_DIR, MAX_OBJECT_SIZE);

      if (result.status === 'PASS') {
        console.log(`[RestoreDrill] PASS: Verified ${result.bytesVerified} bytes. Hash: ${result.hash}`);
        totalBytes += result.bytesVerified!;
      } else {
        // Exclude actual key from error logs
        console.error(`[RestoreDrill] ${result.status}: Verification failed for object_${objectsProcessed} - Reason: ${result.reason}`);
        hasFailure = true;
      }
    }

    console.log(`\n=== DRILL SUMMARY ===`);
    console.log(`Objects Processed: ${objectsProcessed}`);
    console.log(`Total Bytes Verified: ${totalBytes}`);
    console.log(`Result: ${hasFailure ? 'FAILED' : 'PASS'}`);

  } catch {
    console.error(`[RestoreDrill] FATAL Error during drill execution (details omitted for safety).`);
    hasFailure = true;
  }

  // Final cleanup and exit logic
  try {
    await cleanup();
  } catch (cleanupErr) {
    console.error(`[RestoreDrill] CLEANUP_FAILED:`, cleanupErr);
    process.exit(1);
  }

  if (hasFailure) {
    process.exit(1);
  }
}

runDrill();
