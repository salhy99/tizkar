import { createClient } from '@supabase/supabase-js';
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
  
  // We use SupabaseStorageSource but we need to putObject to it. 
  // Let's implement a quick inline put for restore since Source adapter is read-only.

  const backupDir = path.join(process.cwd(), '.storage_backup');
  const destination = new LocalFsDestination(backupDir);

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
  const data = await fs.readFile(path.join(backupDir, targetKey));

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
