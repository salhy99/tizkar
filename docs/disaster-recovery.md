# TIZKAR Platform Disaster Recovery Runbook

## Overview
This runbook defines the exact procedures for recovering the TIZKAR platform from critical failures, specifically focusing on PostgreSQL Database corruption/loss and Supabase Storage (R2) asset loss. It is designed to be executed by engineering personnel during Sev-1 incidents.

## 1. Automated Backups Configuration
The TIZKAR production environment relies on dual, off-site automated backup streams stored immutably in Cloudflare R2.

### 1.1 Database Backups (PostgreSQL)
- **Schedule**: Nightly via GitHub Actions Cron (`0 3 * * *` - 3:00 AM UTC).
- **Format**: `pg_dump` Custom Format (`-Fc`), allowing targeted table, schema, or full-restore operations.
- **Verification**: SHA-256 checksums are generated and uploaded alongside every backup artifact to guarantee integrity.
- **Retention**: Cloudflare R2 bucket lifecycle rules enforce a 30-day retention on standard backups.

### 1.2 Storage Backups (Supabase Assets)
- **Schedule**: Nightly via GitHub Actions Cron (`0 2 * * *` - 2:00 AM UTC).
- **Mechanism**: Rclone bi-directional sync (push-only).
- **Protection**: `--backup-dir` is configured to move deleted/modified production assets into an immutable `archive/` prefix in R2, preventing accidental destruction during syncs.

---

## 2. Recovery Procedures

### 2.1 Database Restore (Full Restore)
Execute this procedure if the Supabase PostgreSQL database is completely lost, corrupted, or requires a point-in-time rollback to a nightly snapshot.

**Prerequisites:**
- `pg_restore` CLI tool installed.
- Access to Cloudflare R2 dashboard.
- New or target PostgreSQL connection string.

**Steps:**
1. **Locate Backup Artifact**: Log into Cloudflare R2, navigate to the `tizkar-backups` bucket.
2. **Download Artifact**: Download the latest `.dump` file (e.g., `tizkar_prod_db_2026-08-31T03:00:00Z.dump`).
3. **Verify Integrity**: Compare the local SHA-256 hash of the downloaded `.dump` file against the `.sha256` checksum file in the same R2 prefix.
   ```bash
   shasum -a 256 tizkar_prod_db_*.dump
   ```
4. **Halt Application Traffic**: Pause Vercel deployments or put the application into maintenance mode to prevent write conflicts during restoration.
5. **Execute pg_restore**:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="postgres://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
     tizkar_prod_db_2026-08-31T03:00:00Z.dump
   ```
6. **Verify Data Integrity**: Connect to the database via `psql` or Supabase Studio and verify `invitations` and `users` table row counts.

### 2.2 Storage Recovery (R2 to Supabase)
Execute this procedure if user assets (images, audio) are deleted or corrupted in the primary Supabase Storage bucket.

**Prerequisites:**
- `rclone` CLI configured with both R2 (`tizkar-r2`) and Supabase (`tizkar-supabase`) endpoints.

**Steps:**
1. **Identify Missing Assets**: Determine if specific files or the entire bucket needs restoration.
2. **Dry Run Sync**:
   Execute a reverse sync from R2 to Supabase with `--dry-run` to audit the incoming changes.
   ```bash
   rclone sync tizkar-r2:tizkar-backups/storage/ tizkar-supabase:invitations_assets/ --dry-run -v
   ```
3. **Execute Restoration**:
   If the dry run is satisfactory, remove the `--dry-run` flag to perform the actual restoration.
   ```bash
   rclone sync tizkar-r2:tizkar-backups/storage/ tizkar-supabase:invitations_assets/ -v
   ```
4. **Archive Recovery**: If assets were deleted *before* the last backup, locate them in the R2 `archive/` directory and manually copy them to the primary bucket prefix using `rclone copy`.

---

## 3. Post-Recovery Validation
After executing DB or Storage restoration:
1. Run the Playwright E2E suite (`npm run test:e2e`) against the staging or production environment.
2. Verify that existing published invitations (`/[slug]`) load their assets and template data correctly.
3. Confirm that the RSVP quota limits remain uncorrupted by attempting a test RSVP submission.

**End of Runbook**
