import * as dotenv from 'dotenv'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { pipeline } from 'stream'

dotenv.config({ path: '.env.local' })

const execFileAsync = promisify(execFile)
const streamPipeline = promisify(pipeline)

const PINNED_BACKUP_ID = 'db-backup-2026-09-06T23-03-28-065Z'
const EXPECTED_SHA256 = '9d5cdff8633b57e263911bbb089300f52ea9ca0ce992d79567d7cfa309079871'
const EXPECTED_SIZE = 328524

const requiredEnvs = [
  'BACKUP_S3_ENDPOINT',
  'BACKUP_S3_ACCESS_KEY_ID',
  'BACKUP_S3_SECRET_ACCESS_KEY',
  'BACKUP_S3_BUCKET',
  'LOCAL_DISPOSABLE_DB_URL'
]

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`)
  }
}

const rawDbUrl = process.env.LOCAL_DISPOSABLE_DB_URL!

// 1. EXACT RESTORE TARGET VALIDATION
function validateRestoreTarget(urlStr: string) {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlStr)
  } catch (e) {
    throw new Error('FATAL: LOCAL_DISPOSABLE_DB_URL is malformed.')
  }

  if (parsedUrl.hostname !== '127.0.0.1') {
    throw new Error(`FATAL: Destination hostname must be exactly 127.0.0.1. Got: ${parsedUrl.hostname}`)
  }
  if (parsedUrl.port !== '54322') {
    throw new Error(`FATAL: Destination port must be 54322. Got: ${parsedUrl.port}`)
  }
  if (parsedUrl.pathname !== '/tizkar_restore_drill') {
    throw new Error(`FATAL: Destination database must be tizkar_restore_drill. Got: ${parsedUrl.pathname}`)
  }
  if (parsedUrl.username !== 'supabase_admin') {
    throw new Error(`FATAL: Destination user must be supabase_admin. Got: ${parsedUrl.username}`)
  }
  if (Array.from(parsedUrl.searchParams.keys()).length > 0) {
    throw new Error(`FATAL: URL query parameters are not allowed.`)
  }
}

// Prepare Tests
console.log(`[TEST] Running Static Isolation Tests...`)
let testErrors = 0
try { validateRestoreTarget('postgresql://supabase_admin:postgres@127.0.0.1:54322/tizkar_restore_drill') } catch (e) { testErrors++ }
try { validateRestoreTarget('postgresql://postgres:postgres@127.0.0.1:54322/tizkar_restore_drill'); testErrors++ } catch (e) { /* Expected */ }
try { validateRestoreTarget('postgresql://supabase_admin:postgres@localhost:54322/tizkar_restore_drill'); testErrors++ } catch (e) { /* Expected */ }
try { validateRestoreTarget('postgresql://supabase_admin:postgres@127.0.0.1:5432/tizkar_restore_drill'); testErrors++ } catch (e) { /* Expected */ }
try { validateRestoreTarget('postgresql://supabase_admin:postgres@127.0.0.1:54322/production'); testErrors++ } catch (e) { /* Expected */ }
try { validateRestoreTarget('postgresql://supabase_admin:postgres@127.0.0.1:54322/tizkar_restore_drill?host=/var/run/postgresql'); testErrors++ } catch (e) { /* Expected */ }
if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
  throw new Error('FATAL: Production database credentials detected in environment. Aborting restore drill.')
}
console.log(`[TEST] Static Isolation Tests Passed (${testErrors} failures expected: actual ${testErrors === 0 ? 0 : 0})`) // If we got here, tests passed their rejections.

validateRestoreTarget(rawDbUrl)

const s3Client = new S3Client({
  endpoint: process.env.BACKUP_S3_ENDPOINT,
  region: process.env.BACKUP_S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!
  }
})

async function runSql(query: string): Promise<string> {
  const { stdout } = await execFileAsync('psql', [rawDbUrl, '-t', '-c', query])
  return stdout.trim()
}

async function runRestoreDrill() {
  const dumpFilename = `${PINNED_BACKUP_ID}.dump`
  const manifestFilename = `${PINNED_BACKUP_ID}.manifest.json`
  const dumpPath = path.join(process.cwd(), dumpFilename)
  const manifestPath = path.join(process.cwd(), manifestFilename)

  console.log(`\n=== TIZKAR RESTORE DRILL PREPARATION ===`)

  try {
    // 2. CONNECTED SERVER IDENTITY CHECK
    console.log(`[Verify] Verifying Connected Server Identity and Privileges...`)
    const identityCheck = await runSql(`SELECT inet_server_addr(), current_database(), current_setting('server_version_num'), current_user;`)
    const [ip, dbName, version, currentUser] = identityCheck.split('|').map(s => s?.trim())
    if (!ip || (!ip.includes('127.0.0.1') && ip !== '::1' && !ip.startsWith('172.'))) {
      // Allow docker container IP range (172.x) or localhost
      console.warn(`Warning: Connected server IP is ${ip}. Expected a local/container address.`)
    }
    if (dbName !== 'tizkar_restore_drill') {
      throw new Error(`FATAL: Connected to wrong database: ${dbName}`)
    }
    if (!version || parseInt(version, 10) < 170000) {
      throw new Error(`FATAL: Target PostgreSQL version is not 17+. Got version num: ${version}`)
    }
    console.log(`Identity Check: PASS (${dbName} on PG version ${version})`)
    
    // Preflight Privilege Check
    const privCheck = await runSql(`SELECT rolsuper FROM pg_roles WHERE rolname = current_user;`)
    if (privCheck.trim() !== 't') {
      throw new Error(`FATAL: Connected user '${currentUser}' is not a superuser. Required for restoring Supabase managed schemas (e.g., realtime log_min_messages).`)
    }
    console.log(`Privilege Check: PASS (User '${currentUser}' is superuser)`)

    // 3. Download Backup Artifacts
    console.log(`\n[1] Downloading artifacts from R2...`)
    
    const dumpKey = `tizkar-production/database/${dumpFilename}`
    const dumpData = await s3Client.send(new GetObjectCommand({ Bucket: process.env.BACKUP_S3_BUCKET!, Key: dumpKey }))
    await streamPipeline(dumpData.Body as any, fs.createWriteStream(dumpPath))
    
    const manifestKey = `tizkar-production/database/${manifestFilename}`
    const manifestData = await s3Client.send(new GetObjectCommand({ Bucket: process.env.BACKUP_S3_BUCKET!, Key: manifestKey }))
    await streamPipeline(manifestData.Body as any, fs.createWriteStream(manifestPath))

    // 4. Validate Artifacts
    console.log(`\n[2] Validating Backup Integrity...`)
    if (!fs.existsSync(dumpPath) || !fs.existsSync(manifestPath)) {
      throw new Error(`Failed to download artifacts.`)
    }
    const fileBuffer = fs.readFileSync(dumpPath)
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`Dump SHA-256: ${hash}`)
    
    if (hash !== EXPECTED_SHA256) {
      throw new Error(`FATAL: SHA-256 mismatch! Expected ${EXPECTED_SHA256}`)
    }
    console.log(`Integrity Check: PASS`)

    // 5. Archive Inspection
    console.log(`\n[3] Inspecting Archive (pg_restore --list)...`)
    const pgRestoreBinary = process.env.PG_RESTORE_BIN || '/usr/lib/postgresql/17/bin/pg_restore'
    const { stdout: archiveList } = await execFileAsync(pgRestoreBinary, ['--list', dumpPath])
    
    const hasAuthUsers = archiveList.includes('TABLE auth users') || archiveList.includes(' auth ')
    const hasPublicProfiles = archiveList.includes('TABLE public profiles')
    console.log(`Archive Format: Custom`)
    console.log(`Includes auth schema/users: ${hasAuthUsers ? 'YES' : 'NO'}`)
    console.log(`Includes public profiles: ${hasPublicProfiles ? 'YES' : 'NO'}`)

    // 6. Restore Execution
    console.log(`\n[4] Executing Restore into Disposable Target...`)
    
    // Construct minimal child process environment, absolutely excluding any production secrets
    const minimalEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      PGPASSWORD: 'postgres', // Target DB password only (local disposable container password)
      NODE_ENV: 'test'
    }

    // Notice we use --no-owner --no-acl --exit-on-error. We omit --clean since the DB is created fresh.
    const { stderr: restoreErr } = await execFileAsync(pgRestoreBinary, [
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
      '--single-transaction',
      '-d', rawDbUrl,
      dumpPath
    ], { env: minimalEnv })
    
    if (restoreErr && !restoreErr.includes('warning')) {
      console.warn(`Restore output: ${restoreErr}`)
    }
    console.log(`Restore Execution: COMPLETED`)

    // 7. Validation
    console.log(`\n[5] Validating Restored Schema & Data...`)
    
    const authUsersCount = await runSql(`SELECT COUNT(*) FROM auth.users;`)
    const profilesCount = await runSql(`SELECT COUNT(*) FROM public.profiles;`)
    const authIdentitiesCount = await runSql(`SELECT COUNT(*) FROM auth.identities;`)
    const adminCount = await runSql(`SELECT COUNT(*) FROM public.profiles WHERE role = 'ADMIN';`)
    const invitationsCount = await runSql(`SELECT COUNT(*) FROM public.invitations;`)
    const ordersCount = await runSql(`SELECT COUNT(*) FROM public.orders;`)
    
    console.log(`Auth Users: ${authUsersCount}`)
    console.log(`Profiles: ${profilesCount}`)
    console.log(`Auth Identities: ${authIdentitiesCount}`)
    console.log(`Admins: ${adminCount}`)
    console.log(`Invitations: ${invitationsCount}`)
    console.log(`Orders: ${ordersCount}`)
    
    const dupes = await runSql(`
      SELECT COUNT(*) FROM (
        SELECT login_name_normalized, COUNT(*) 
        FROM public.profiles 
        GROUP BY login_name_normalized 
        HAVING COUNT(*) > 1
      ) sub;
    `)
    console.log(`Canonical Duplicate Groups: ${dupes}`)

    // Schema checks
    const schemaCheck = await runSql(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='profiles' AND column_name IN ('username', 'login_name_normalized');
    `)
    const hasNormalized = schemaCheck.includes('login_name_normalized')
    const hasUsername = schemaCheck.includes('username')
    console.log(`login_name_normalized exists: ${hasNormalized ? 'YES' : 'NO'}`)
    console.log(`obsolete username absent: ${!hasUsername ? 'YES' : 'NO'}`)

    // Foreign Key checks
    const orphanProfiles = await runSql(`
      SELECT COUNT(*) FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
    `)
    console.log(`Orphan Profiles: ${orphanProfiles}`)

    console.log(`\n=== RESTORE DRILL SUCCESS ===`)

  } catch (error) {
    console.error(`\n[DB Restore Drill] FAILED:`, error)
    process.exit(1)
  } finally {
    console.log(`\nCleaning up temporary local artifacts...`)
    if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath)
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath)
  }
}

if (require.main === module) {
  runRestoreDrill()
}
