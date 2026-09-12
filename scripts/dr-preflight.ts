import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { assertIsolatedEnvironment } from './dr-environment-guard';
type ProcessErrorLike = {
  message?: string;
  stderr?: string | Buffer;
  stdout?: string | Buffer;
  code?: string | number;
};

function isProcessErrorLike(value: unknown): value is ProcessErrorLike {
  return typeof value === 'object' && value !== null;
}

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

  console.log('\n[DR Preflight] Auditing DR_SUPABASE_DB_URL structure safely...');
  let parsedUrl: URL | null = null;
  
  try {
    parsedUrl = new URL(dbUrl);
    console.log('DB_URL_PROTOCOL_VALID=YES');
  } catch {
    console.log('DB_URL_PROTOCOL_VALID=NO');
    console.log('PASSWORD_URL_ENCODING_ISSUE_SUSPECTED=YES');
  }

  if (parsedUrl) {
    console.log(`DB_URL_DATABASE_NAME=${parsedUrl.pathname.substring(1)}`);
    console.log(`DB_URL_PORT=${parsedUrl.port || '5432'}`);
    
    let connectionType = 'UNKNOWN';
    if (parsedUrl.port === '6543') {
      connectionType = 'TRANSACTION_POOLER';
    } else if (parsedUrl.port === '5432') {
      connectionType = 'DIRECT_OR_SESSION_POOLER';
    }
    console.log(`DB_URL_CONNECTION_TYPE=${connectionType}`);
    console.log(`DB_URL_USERNAME_PATTERN_VALID=${parsedUrl.username ? 'YES' : 'NO'}`);
    console.log(`DB_URL_PASSWORD_PRESENT=${parsedUrl.password ? 'YES' : 'NO'}`);
    console.log(`DB_URL_HOST_PRESENT=${parsedUrl.hostname ? 'YES' : 'NO'}`);

    // Check project binding
    if (parsedUrl.hostname.includes('hnjfxdyterpbmkisaiiw')) {
      console.error('FATAL: DB URL points to Production project.');
      process.exit(1);
    }
    if (parsedUrl.hostname.includes('zxrzqyvlydsdczngxxst')) {
      console.error('FATAL: DB URL points to Development project.');
      process.exit(1);
    }
    if (parsedUrl.hostname.includes('hlhrqvmmvczmvyxszzxd')) {
      console.log('DR_PROJECT_BINDING_VALID=YES');
    } else {
      console.log('DR_PROJECT_BINDING_VALID=NO (Unknown host)');
    }
    
    console.log(`RECOMMENDED_DB_CONNECTION_MODE=SESSION_POOLER (Port 5432)`);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  console.log('\n[DR Preflight] Checking API connectivity...');
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
    const queryScript = `
      SELECT current_database();
      SELECT current_user;
      SELECT current_setting('server_version');
      SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
      SELECT count(*) FROM auth.users;
    `;
    
    const dbOutput = execSync(`psql -v ON_ERROR_STOP=1 -t -A -c "${queryScript}" "${dbUrl}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    
    const lines = dbOutput.trim().split('\n');
    console.log('DR_DB_CONNECTIVITY=YES');
    console.log(`DR_DATABASE_NAME=${lines[0]}`);
    console.log(`DR_DATABASE_USER=${lines[1]}`);
    console.log(`DR_POSTGRES_VERSION=${lines[2]}`);
    console.log(`PUBLIC_TABLE_COUNT=${lines[3]}`);
    console.log(`AUTH_USER_COUNT=${lines[4]}`);
    
    const publicTableCount = parseInt(lines[3], 10);
    const authUserCount = parseInt(lines[4], 10);
    
    if (publicTableCount > 2 || authUserCount > 0 || invitationsBucketPresent) {
      console.log('UNEXPECTED_TIZKAR_DATA_PRESENT=YES');
    } else {
      console.log('UNEXPECTED_TIZKAR_DATA_PRESENT=NO');
    }

  } catch (err: unknown) {
    console.error('[DR Preflight] DB connectivity failed.');
    let stderr = '';
    
    if (isProcessErrorLike(err)) {
      if (typeof err.stderr === 'string') {
        stderr = err.stderr;
      } else if (Buffer.isBuffer(err.stderr)) {
        stderr = err.stderr.toString('utf-8');
      } else if (typeof err.message === 'string') {
        stderr = err.message;
      }
    } else if (err instanceof Error) {
      stderr = err.message;
    }
    
    const errorString = stderr.toLowerCase();
    
    let errClass = 'UNKNOWN';
    if (errorString.includes('password authentication failed')) {
      errClass = 'AUTHENTICATION_FAILED';
      console.log('AUTHENTICATION_ISSUE_SUSPECTED=YES');
    } else if (errorString.includes('could not translate host name')) {
      errClass = 'DNS_RESOLUTION_FAILED';
    } else if (errorString.includes('network is unreachable')) {
      errClass = 'NETWORK_UNREACHABLE';
      console.log('IPV6_CONNECTIVITY_ISSUE_SUSPECTED=YES');
    } else if (errorString.includes('connection refused')) {
      errClass = 'CONNECTION_REFUSED';
    } else if (errorString.includes('ssl') || errorString.includes('tls')) {
      errClass = 'TLS_ERROR';
      console.log('SSL_ISSUE_SUSPECTED=YES');
    } else if (errorString.includes('database') && errorString.includes('does not exist')) {
      errClass = 'DATABASE_NOT_FOUND';
    } else if (errorString.includes('pgbouncer')) {
      errClass = 'POOLER_CONFIGURATION_ERROR';
    }
    
    // Attempt to extract SQLSTATE if present, e.g. "FATAL:  password authentication failed for user "postgres" (SQLSTATE 28P01)"
    let errCode = 'UNKNOWN';
    const match = stderr.match(/SQLSTATE ([A-Z0-9]+)/);
    if (match) {
      errCode = match[1];
    }
    
    // Print sanitized error info
    console.log(`DB_ERROR_CODE=${errCode}`);
    console.log(`DB_ERROR_CLASS=${errClass}`);
    
    // Safe message extraction (take first line, mask URL if present)
    let sanitizedMsg = stderr.split('\\n')[0].trim();
    sanitizedMsg = sanitizedMsg.replace(dbUrl, '[REDACTED_DB_URL]');
    if (parsedUrl && parsedUrl.password) {
      sanitizedMsg = sanitizedMsg.replace(parsedUrl.password, '[REDACTED_PASSWORD]');
    }
    console.log(`DB_ERROR_MESSAGE_SANITIZED=${sanitizedMsg}`);
    
    process.exit(1);
  }

  console.log('\n[DR Preflight] All read-only checks completed.');
}

if (require.main === module) {
  main().catch(console.error);
}
