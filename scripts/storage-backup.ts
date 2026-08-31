import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageSource } from '../src/lib/storage/backup/supabase-source';
import { S3CompatibleDestination } from '../src/lib/storage/backup/s3-destination';
import { LocalFsDestination } from '../src/lib/storage/backup/local-destination';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function runBackup() {
  const isDryRun = process.argv.includes('--dry-run');
  const bucketName = process.env.SOURCE_BUCKET || 'invitations_assets';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to read private bucket

  console.log(`[Backup] Starting ${isDryRun ? 'DRY RUN' : 'EXECUTION'}`);
  console.log(`[Backup] Source: Supabase (${supabaseUrl}), Bucket: ${bucketName}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const source = new SupabaseStorageSource(supabase, bucketName);
  
  let destination;
  
  if (process.env.BACKUP_S3_ENDPOINT) {
    destination = new S3CompatibleDestination(
      process.env.BACKUP_S3_ENDPOINT,
      process.env.BACKUP_S3_REGION || 'auto',
      process.env.BACKUP_S3_ACCESS_KEY_ID!,
      process.env.BACKUP_S3_SECRET_ACCESS_KEY!,
      process.env.BACKUP_S3_BUCKET!
    );
    console.log(`[Backup] Destination: S3 (${process.env.BACKUP_S3_ENDPOINT}/${process.env.BACKUP_S3_BUCKET})`);
  } else {
    const backupDir = path.join(process.cwd(), '.storage_backup');
    destination = new LocalFsDestination(backupDir);
    console.log(`[Backup] Destination: LocalFS (${backupDir})`);
  }

  let objectsExamined = 0;
  let objectsCopied = 0;
  let bytesCopied = 0;
  let failures = 0;

  try {
    const sourceObjects = await source.listObjects();
    
    for (const obj of sourceObjects) {
      objectsExamined++;
      const destObj = await destination.headObject(obj.key);
      
      let needsCopy = false;
      let reason = '';

      if (!destObj) {
        needsCopy = true;
        reason = 'New object';
      } else if (destObj.size !== obj.size) {
        needsCopy = true;
        reason = 'Size mismatch';
      } else {
        if (!destObj.checksum && !destObj.etag) {
          needsCopy = true;
          reason = 'Missing destination identity';
        } else {
          // If size matches and we have identity signals
          if (obj.etag && destObj.etag && destObj.etag !== obj.etag) {
            needsCopy = true;
            reason = 'ETag mismatch';
          } else if (obj.checksum && destObj.checksum && destObj.checksum !== obj.checksum) {
            needsCopy = true;
            reason = 'Checksum mismatch';
          } else {
             needsCopy = false; // Identical
          }
        }
      }

      if (needsCopy) {
        if (isDryRun) {
          console.log(`[DryRun] Would copy ${obj.key} (${obj.size} bytes) - ${reason}`);
        } else {
          try {
            console.log(`[Backup] Copying ${obj.key} (${obj.size} bytes)...`);
            const data = await source.getObject(obj.key);
            if (!data) throw new Error(`Failed to download ${obj.key} from source`);

            const result = await destination.putObject(obj.key, data, obj.mime);
            if (result.success) {
              objectsCopied++;
              bytesCopied += obj.size;
            } else {
              throw new Error(`Destination returned failure for ${obj.key}`);
            }
          } catch (e) {
            console.error(`[Backup] Failed to copy ${obj.key}:`, e);
            failures++;
          }
        }
      } else {
        console.log(`[Backup] Skiping ${obj.key} (Already backed up and verified)`);
      }
    }

    console.log(`\n--- Backup Run Summary ---`);
    console.log(`Status: ${failures > 0 ? 'PARTIAL' : 'SUCCESS'}`);
    console.log(`Objects Examined: ${objectsExamined}`);
    console.log(`Objects Copied: ${objectsCopied}`);
    console.log(`Bytes Copied: ${bytesCopied}`);
    console.log(`Failures: ${failures}`);

  } catch (error) {
    console.error(`[Backup] Fatal run error:`, error);
  }
}

runBackup();
