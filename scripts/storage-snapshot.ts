import { S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageSource } from '../src/lib/storage/backup/supabase-source';
import { SnapshotOrchestrator } from '../src/lib/storage/backup/snapshot/orchestrator';

async function runSnapshot() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const s3Endpoint = process.env.BACKUP_S3_ENDPOINT;
  const s3Region = process.env.BACKUP_S3_REGION || 'auto';
  const s3AccessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const s3SecretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
  const s3Bucket = process.env.BACKUP_S3_BUCKET;

  if (!supabaseUrl || !supabaseKey) {
    console.error('FATAL: Missing Supabase credentials.');
    process.exit(1);
  }

  if (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket) {
    console.error('FATAL: Missing R2 credentials.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const sourceAdapter = new SupabaseStorageSource(supabase, 'invitations_assets');

  const s3Client = new S3Client({
    endpoint: s3Endpoint,
    region: s3Region,
    credentials: { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey }
  });

  const orchestrator = new SnapshotOrchestrator(s3Client, sourceAdapter, s3Bucket, 'invitations_assets');

  try {
    const result = await orchestrator.runSnapshot();
    console.log('\n=== SNAPSHOT SUMMARY ===');
    console.log(`SNAPSHOT_ID: ${result.snapshot_id}`);
    console.log(`STATE: ${result.state}`);
    console.log(`STARTED_AT: ${result.started_at}`);
    console.log(`COMPLETED_AT: ${result.completed_at || 'N/A'}`);
    console.log(`OBJECTS_DISCOVERED: ${result.total_objects}`);
    console.log(`TOTAL_BYTES_LOGICAL: ${result.total_bytes}`);
    console.log(`MANIFEST_SHA256: ${result.manifest_sha256}`);
  } catch (err: unknown) {
    console.error('\n=== SNAPSHOT FAILED ===');
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(1);
  }
}

runSnapshot();
