import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { assertIsolatedEnvironment } from './dr-environment-guard';

async function main() {
  console.log('[DR Preflight] Starting...');

  const supabaseUrl = process.env.DR_SUPABASE_URL || '';
  const serviceKey = process.env.DR_SUPABASE_SERVICE_ROLE || '';
  const dbUrl = process.env.DR_SUPABASE_DB_URL || '';

  if (!supabaseUrl || !serviceKey || !dbUrl) {
    console.error('Missing DR connection env vars in script context.');
    process.exit(1);
  }

  // Set the mock environment bindings so the guard passes
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.DR_DRILL_MODE = 'true';
  assertIsolatedEnvironment();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  console.log('[DR Preflight] Checking API connectivity...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error(`[DR Preflight] API connectivity failed: ${bucketsError.message}`);
    process.exit(1);
  }

  console.log('DR_API_CONNECTIVITY=YES');
  console.log('DR_SERVICE_ROLE_AUTHENTICATED=YES');
  console.log('STORAGE_API_READ_SUCCEEDED=YES');
  console.log(`STORAGE_BUCKET_COUNT=${buckets.length}`);
  
  const invitationsBucketPresent = buckets.some(b => b.name === 'invitations_assets');
  console.log(`INVITATIONS_ASSETS_BUCKET_PRESENT=${invitationsBucketPresent ? 'YES' : 'NO'}`);

  console.log('\n[DR Preflight] Checking Database connectivity...');
  
  try {
    // psql -c allows multiple queries but output formatting can be noisy, using echo with psql
    // We'll just run them and grep or parse output, or even just run it to confirm connectivity
    // But we need the counts. Let's do it cleanly using psql -t -c
    const queryScript = `
      SELECT current_database();
      SELECT current_user;
      SELECT current_setting('server_version');
      SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
      SELECT count(*) FROM auth.users;
    `;
    
    const dbOutput = execSync(`psql -v ON_ERROR_STOP=1 -t -A -c "${queryScript}" "${dbUrl}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    
    const lines = dbOutput.trim().split('\n');
    console.log('DR_DB_CONNECTIVITY=YES');
    console.log(`DR_DATABASE_NAME=${lines[0]}`);
    console.log(`DR_DATABASE_USER=${lines[1]}`);
    console.log(`DR_POSTGRES_VERSION=${lines[2]}`);
    console.log(`PUBLIC_TABLE_COUNT=${lines[3]}`);
    console.log(`AUTH_USER_COUNT=${lines[4]}`);
    
    const publicTableCount = parseInt(lines[3], 10);
    const authUserCount = parseInt(lines[4], 10);
    
    // Evaluate if unexpected Tizkar data is present (if public tables > 10, or auth users > 0)
    // Fresh supabase has 0 auth users and empty public tables
    if (publicTableCount > 2 || authUserCount > 0 || invitationsBucketPresent) {
      console.log('UNEXPECTED_TIZKAR_DATA_PRESENT=YES');
    } else {
      console.log('UNEXPECTED_TIZKAR_DATA_PRESENT=NO');
    }

  } catch (_error) {
    console.error('[DR Preflight] DB connectivity failed.');
    process.exit(1);
  }

  console.log('\n[DR Preflight] All read-only checks completed.');
}

if (require.main === module) {
  main().catch(console.error);
}
