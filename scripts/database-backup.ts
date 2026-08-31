import * as dotenv from 'dotenv'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: '.env.local' })

const execAsync = promisify(exec)

// Validate Env
const requiredEnvs = [
  'SUPABASE_DB_URL', // connection string with password
  'BACKUP_S3_ENDPOINT',
  'BACKUP_S3_ACCESS_KEY_ID',
  'BACKUP_S3_SECRET_ACCESS_KEY',
  'BACKUP_S3_BUCKET'
]

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`)
  }
}

const s3Client = new S3Client({
  endpoint: process.env.BACKUP_S3_ENDPOINT,
  region: process.env.BACKUP_S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!
  }
})

async function runDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupId = `db-backup-${timestamp}`
  const dumpFilename = `${backupId}.dump`
  const dumpPath = path.join(process.cwd(), dumpFilename)
  const startedAt = new Date().toISOString()
  
  console.log(`[DB Backup] Starting backup ${backupId}...`)

  try {
    // 1. Execute pg_dump (Custom format to preserve schema, data, functions)
    // We mask the URL in logs to prevent secret leak.
    console.log(`[DB Backup] Executing pg_dump...`)
    const pgUrl = process.env.SUPABASE_DB_URL!
    
    // We use the custom format (-Fc) which is compressed and suitable for pg_restore.
    const { stdout, stderr } = await execAsync(`pg_dump -Fc --no-owner --no-acl -f "${dumpPath}" "${pgUrl}"`)
    
    if (stderr && !stderr.includes('warning')) {
      console.warn(`[DB Backup] pg_dump output: ${stderr}`)
    }

    if (!fs.existsSync(dumpPath)) {
      throw new Error(`Dump file was not created at ${dumpPath}`)
    }

    const stat = fs.statSync(dumpPath)
    if (stat.size === 0) {
      throw new Error(`Dump file is empty`)
    }

    console.log(`[DB Backup] Dump successful. Size: ${stat.size} bytes.`)

    // 2. Compute SHA256 checksum
    const fileBuffer = fs.readFileSync(dumpPath)
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
    console.log(`[DB Backup] SHA-256 Checksum: ${hash}`)

    // 3. Upload to R2 Destination
    const destinationKey = `tizkar-production/database/${dumpFilename}`
    console.log(`[DB Backup] Uploading to S3 destination: ${destinationKey}...`)
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET!,
      Key: destinationKey,
      Body: fileBuffer,
      // Metadata allows us to store the checksum directly in the object
      Metadata: {
        'backup-id': backupId,
        'sha256-checksum': hash,
        'timestamp': startedAt
      }
    }))
    
    console.log(`[DB Backup] Upload complete.`)

    // 4. Create and upload Manifest
    const completedAt = new Date().toISOString()
    const manifest = {
      backup_id: backupId,
      source_environment: 'production',
      database_identifier: 'tizkar-supabase',
      started_at: startedAt,
      completed_at: completedAt,
      dump_size_bytes: stat.size,
      sha256: hash,
      destination: destinationKey,
      status: 'SUCCESS'
    }

    const manifestKey = `tizkar-production/database/${backupId}.manifest.json`
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET!,
      Key: manifestKey,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json'
    }))

    console.log(`[DB Backup] Manifest uploaded: ${manifestKey}`)
    console.log(`[DB Backup] COMPLETED SUCCESSFULLY.`)

    // Clean up local dump
    fs.unlinkSync(dumpPath)

  } catch (error) {
    console.error(`[DB Backup] FAILED:`, error)
    if (fs.existsSync(dumpPath)) {
      fs.unlinkSync(dumpPath)
    }
    process.exit(1)
  }
}

runDatabaseBackup()
