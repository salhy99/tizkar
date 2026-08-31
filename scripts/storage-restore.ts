import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3CompatibleDestination } from '../src/lib/storage/backup/s3-destination';
import { LocalFsDestination } from '../src/lib/storage/backup/local-destination';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

async function runRestore() {
  const isDryRun = process.argv.includes('--dry-run');
  const targetKey = process.argv[2];
  
  if (targetKey === '--dry-run' || !targetKey) {
    console.error("Usage: npx tsx scripts/storage-restore.ts <object-key> [--dry-run]");
    process.exit(1);
  }

  const bucketName = process.env.SOURCE_BUCKET || 'invitations_assets';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let destination;
  const backupDir = path.join(process.cwd(), '.storage_backup');
  if (process.env.BACKUP_S3_ENDPOINT) {
    destination = new S3CompatibleDestination(
      process.env.BACKUP_S3_ENDPOINT,
      process.env.BACKUP_S3_REGION || 'auto',
      process.env.BACKUP_S3_ACCESS_KEY_ID!,
      process.env.BACKUP_S3_SECRET_ACCESS_KEY!,
      process.env.BACKUP_S3_BUCKET!
    );
  } else {
    destination = new LocalFsDestination(backupDir);
  }

  console.log(`[Restore] Starting ${isDryRun ? 'DRY RUN' : 'EXECUTION'}`);
  console.log(`[Restore] Target Key: ${targetKey}`);

  const backupObj = await destination.headObject(targetKey);
  if (!backupObj) {
    console.error(`[Restore] Error: Backup object not found for ${targetKey}`);
    process.exit(1);
  }

  // Check if it exists in source
  const { data: existingSrc } = await supabase.storage.from(bucketName).download(targetKey);
  if (existingSrc) {
    console.log(`[Restore] Skipping: Object ${targetKey} already exists in primary storage.`);
    return;
  }

  if (isDryRun) {
    console.log(`[DryRun] Would restore ${targetKey} (${backupObj.size} bytes, ${backupObj.mime})`);
    return;
  }

  // Actual restore
  // We need a getObject from destination
  // But LocalFsDestination doesn't expose getObject in interface yet.
  // For the script, we read directly:
  let data;
  if (process.env.BACKUP_S3_ENDPOINT) {
    const s3 = new S3Client({
      endpoint: process.env.BACKUP_S3_ENDPOINT,
      region: process.env.BACKUP_S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!,
      }
    });
    const s3Data = await s3.send(new GetObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET!,
      Key: targetKey
    }));
    if (s3Data.Body) {
      const body = s3Data.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.from(chunk));
      }
      data = Buffer.concat(chunks);
    } else {
      throw new Error("Empty body from S3");
    }
  } else {
    data = await fs.readFile(path.join(backupDir, targetKey));
  }

  console.log(`[Restore] Uploading to Supabase...`);
  const { error } = await supabase.storage.from(bucketName).upload(targetKey, data, {
    contentType: backupObj.mime,
    upsert: false
  });

  if (error) {
    console.error(`[Restore] Failed to restore:`, error);
  } else {
    console.log(`[Restore] Successfully restored ${targetKey}`);
  }
}

runRestore();
