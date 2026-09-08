import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  console.error('FATAL ERROR: NEXT_PUBLIC_SUPABASE_URL is malformed.');
  process.exit(1);
}

const PRODUCTION_PROJECT_ID = 'hnjfxdyterpbmkisaiiw';
const DEVELOPMENT_PROJECT_ID = 'zxrzqyvlydsdczngxxst';
const hostname = parsedUrl.hostname.toLowerCase();

if (hostname.includes(PRODUCTION_PROJECT_ID) || hostname.includes('tizkar.com')) {
  console.error('FATAL ERROR: Configuration points to the PRODUCTION Supabase project or alias.');
  console.error('Aborting preflight to prevent production data corruption.');
  process.exit(1);
}

if (!hostname.includes(DEVELOPMENT_PROJECT_ID) && hostname !== 'localhost' && hostname !== '127.0.0.1') {
  console.warn('WARNING: Supabase URL does not match known Development Project ID or local network. Assuming staging environment.');
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
let parsedAppUrl;
try {
  parsedAppUrl = new URL(appUrl);
} catch {
  console.error('FATAL ERROR: NEXT_PUBLIC_APP_URL is malformed.');
  process.exit(1);
}

const appHostname = parsedAppUrl.hostname.toLowerCase();
if (appHostname.includes('tizkar.vercel.app') || appHostname === 'tizkar.com' || appHostname.endsWith('.tizkar.com')) {
  console.error('FATAL ERROR: NEXT_PUBLIC_APP_URL points to PRODUCTION application domain.');
  console.error('Aborting preflight to prevent production data corruption.');
  process.exit(1);
}

// Check Connectivity
async function checkConnectivity() {
  const healthUrl = new URL('/rest/v1/', parsedUrl).toString();
  console.log(`Checking connectivity to: ${healthUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`FATAL: Connectivity check failed with HTTP ${response.status}: ${response.statusText}`);
      process.exit(1);
    }
    
    console.log('Connectivity check passed.');
    console.log('=== PREFLIGHT SUCCESS ===');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('FATAL: Connectivity check timed out after 5000ms.');
    } else {
      console.error('FATAL: Connectivity check failed with error:', error.message);
    }
    process.exit(1);
  }
}

checkConnectivity();
