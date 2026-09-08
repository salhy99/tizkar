/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local if running locally
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

console.log('=== E2E PREFLIGHT CHECK ===');

const requiredEnvs = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD'
];

let missing = false;
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    console.error(`ERROR: Missing required environment variable: ${env}`);
    missing = true;
  }
}

if (missing) {
  console.error('FATAL: Preflight environment check failed.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PRODUCTION_PROJECT_ID = 'hnjfxdyterpbmkisaiiw';
const DEVELOPMENT_PROJECT_ID = 'zxrzqyvlydsdczngxxst';

if (supabaseUrl.includes(PRODUCTION_PROJECT_ID)) {
  console.error('FATAL ERROR: Configuration points to the PRODUCTION Supabase project.');
  console.error('Aborting preflight to prevent production data corruption.');
  process.exit(1);
}

if (!supabaseUrl.includes(DEVELOPMENT_PROJECT_ID)) {
  console.warn('WARNING: Supabase URL does not match known Development Project ID. Assuming local or staging environment.');
}

// Check Connectivity
async function checkConnectivity() {
  const healthUrl = `${supabaseUrl}/rest/v1/`;
  console.log(`Checking connectivity to: ${healthUrl}`);
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      console.error(`FATAL: Connectivity check failed with HTTP ${response.status}: ${response.statusText}`);
      process.exit(1);
    }
    
    console.log('Connectivity check passed.');
    console.log('=== PREFLIGHT SUCCESS ===');
    process.exit(0);
  } catch (error) {
    console.error('FATAL: Connectivity check failed with error:', error.message);
    process.exit(1);
  }
}

checkConnectivity();
