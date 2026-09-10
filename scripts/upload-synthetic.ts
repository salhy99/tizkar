import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';

async function run() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing credentials");

    const projectRefMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const effectiveRef = projectRefMatch ? projectRefMatch[1] : 'unknown';
    
    if (effectiveRef !== 'hnjfxdyterpbmkisaiiw') {
      throw new Error(`EFFECTIVE_PROJECT_REF ${effectiveRef} != hnjfxdyterpbmkisaiiw`);
    }

    const supabase = createClient(url, key);
    const bucket = 'invitations_assets';
    const objectKey = 'synthetic/restore-drill-v1/sample.png';
    const expectedSha256 = '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Pre-upload check
    const { data: existing, error: statError } = await supabase.storage.from(bucket).download(objectKey);
    let uploadResult = 'UPLOADED';
    if (!statError && existing) {
      uploadResult = 'SAMPLE_ALREADY_EXISTS';
      console.log('SAMPLE_ALREADY_EXISTS. Skipping upload.');
    } else {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(objectKey, buffer, {
        contentType: 'image/png',
        upsert: false
      });
      if (uploadError) throw uploadError;
      console.log('Upload successful.');
    }

    // 4. Verify
    const { data: verifyData, error: verifyError } = await supabase.storage.from(bucket).download(objectKey);
    if (verifyError || !verifyData) throw new Error("Verification download failed");

    const arrayBuffer = await verifyData.arrayBuffer();
    const verifyBuffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash('sha256').update(verifyBuffer).digest('hex');

    const result = {
      EXECUTION_LOCATION: 'GitHub Actions',
      EFFECTIVE_PROJECT_REF: effectiveRef,
      EXPECTED_PROJECT_REF: 'hnjfxdyterpbmkisaiiw',
      PROJECT_MATCH: 'YES',
      UPLOAD_RESULT: uploadResult,
      OBJECT_EXISTS: 'YES',
      BYTE_SIZE: verifyBuffer.length,
      CONTENT_TYPE: verifyData.type || 'image/png',
      SHA256_VERIFIED: hash === expectedSha256 ? 'YES' : 'NO'
    };

    fs.writeFileSync('synthetic-result.json', JSON.stringify(result, null, 2));
    console.log("Success. Results written to synthetic-result.json");
  } catch (err) {
    console.error(err);
    const result = {
      EXECUTION_LOCATION: 'GitHub Actions',
      ERROR: String(err)
    };
    fs.writeFileSync('synthetic-result.json', JSON.stringify(result, null, 2));
    process.exit(1); // Exit 1 to fail the action, but it writes the json first
  }
}
run();
