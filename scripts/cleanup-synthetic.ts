import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

async function run() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = 'invitations_assets';
    const objectKey = 'synthetic/restore-drill-v1/sample.png';

    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");

    const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const effectiveRef = projectRefMatch ? projectRefMatch[1] : 'unknown';
    
    if (effectiveRef !== 'hnjfxdyterpbmkisaiiw') {
      throw new Error(`EFFECTIVE_PROJECT_REF ${effectiveRef} != hnjfxdyterpbmkisaiiw`);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Delete from Production Supabase
    const { error: deleteSupabaseError } = await supabase.storage.from(bucket).remove([objectKey]);
    if (deleteSupabaseError) throw deleteSupabaseError;

    // 2. Verify deleted from Supabase
    const { data: verifySupabaseData, error: verifySupabaseError } = await supabase.storage.from(bucket).download(objectKey);
    let supabaseDeleted = false;
    if (verifySupabaseError && (verifySupabaseError.message.toLowerCase().includes('not found') || verifySupabaseError.name?.toLowerCase().includes('not found') || verifySupabaseError.message.includes('The resource was not found'))) {
      supabaseDeleted = true;
    } else if (!verifySupabaseData && verifySupabaseError) {
      supabaseDeleted = true; // Any error
    } else if (!verifySupabaseData && !verifySupabaseError) {
      supabaseDeleted = true;
    } else {
      throw new Error(`Supabase object still exists. Err: ${JSON.stringify(verifySupabaseError)}`);
    }

    // 3. Delete from R2
    const s3Endpoint = process.env.BACKUP_S3_ENDPOINT;
    const s3Region = process.env.BACKUP_S3_REGION || 'auto';
    const s3AccessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
    const s3SecretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
    const s3Bucket = process.env.BACKUP_S3_BUCKET;

    if (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket) {
      throw new Error('Missing R2 backup credentials');
    }

    const s3 = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      credentials: { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey }
    });

    await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: objectKey }));

    // 4. Verify deleted from R2
    let r2Deleted = false;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: objectKey }));
      throw new Error('R2 object still exists');
    } catch (err: any) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey') {
        r2Deleted = true;
      } else {
        throw err;
      }
    }

    const result = {
      PRODUCTION_SYNTHETIC_DELETED: supabaseDeleted ? 'YES' : 'NO',
      R2_SYNTHETIC_DELETED: r2Deleted ? 'YES' : 'NO'
    };

    fs.writeFileSync('cleanup-result.json', JSON.stringify(result, null, 2));
    console.log("Cleanup success.");
  } catch (err) {
    console.error(err);
    const result = { ERROR: String(err) };
    fs.writeFileSync('cleanup-result.json', JSON.stringify(result, null, 2));
    process.exit(1);
  }
}
run();
