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
- **Credentials**: The GitHub Actions runner uses a strictly scoped R2 API token (Writer) restricted to `PUT`, `HEAD`, `LIST` on the `tizkar-production/database/` prefix. It has NO `DELETE` permissions and cannot read/write media assets.

### 1.2 Storage Backups (Supabase Assets)
- **Schedule**: Nightly via GitHub Actions Cron (`0 2 * * *` - 2:00 AM UTC).
- **Mechanism**: Rclone bi-directional sync (push-only).
- **Protection**: `--backup-dir` is configured to move deleted/modified production assets into an immutable `archive/` prefix in R2, preventing accidental destruction during syncs.

---

## 2. Recovery Procedures

### 2.1 Database Restore (Supabase Target)
Execute this procedure if the Supabase PostgreSQL database is completely lost, corrupted, or requires a point-in-time rollback to a nightly snapshot into a FRESH Supabase project.

**Important Note on Dump Scope (Option A):** The automated backup captures a full forensic snapshot of all accessible schemas (`public`, `auth`, `storage`, etc.) in custom format (`-Fc`). However, because Supabase pre-provisions managed schemas with project-specific extensions and triggers, **you must never execute a blind full pg_restore over a new Supabase project.** Instead, use the component-by-component selective restore method below.

**Prerequisites:**
- `pg_restore` CLI tool installed.
- Access to Cloudflare R2 dashboard.
- A fresh Supabase project with database credentials, matching Auth configuration (JWT settings, providers), and Storage buckets manually pre-configured.

**Steps:**
1. **Locate Backup Artifact**: Log into Cloudflare R2, navigate to the `tizkar-production/database/` prefix.
2. **Download Artifact**: Download the latest `.dump` file (e.g., `db-backup-2026-08-31T03-00-00.dump`).
3. **Verify Integrity**: Compare the local SHA-256 hash of the downloaded `.dump` file against the SHA-256 recorded in the adjacent `.manifest.json`.
   ```bash
   shasum -a 256 db-backup-*.dump
   ```
4. **Halt Application Traffic**: Point DNS away or put the application into maintenance mode.
5. **Restore Application Schema (Public)**:
   Restore the `public` schema containing all application tables, data, functions, indexes, and RLS policies.
   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl -n public \
     --dbname="<TARGET_SUPABASE_DB_URL>" \
     db-backup-2026-08-31T03-00-00.dump
   ```
6. **Restore Auth Data (Legacy Support)**:
   Restore ONLY the data (not the schema definitions) for `auth.users` and `auth.identities` to preserve legacy user access. This avoids overwriting Supabase's built-in auth triggers.
   ```bash
   pg_restore --data-only --no-owner --no-acl -n auth -t users -t identities \
     --dbname="<TARGET_SUPABASE_DB_URL>" \
     db-backup-2026-08-31T03-00-00.dump
   ```
7. **Restore Storage Metadata**:
   Restore ONLY the data for `storage.buckets` and `storage.objects`.
   ```bash
   pg_restore --data-only --no-owner --no-acl -n storage -t buckets -t objects \
     --dbname="<TARGET_SUPABASE_DB_URL>" \
     db-backup-2026-08-31T03-00-00.dump
   ```
8. **Verify Data Integrity**: Connect to the database via `psql` or Supabase Studio and verify `invitations`, `auth.users`, and `product_funnel_events` row counts.

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

### 2.3 Supabase Provider Configuration (Manual Recovery)
If recovering into a fresh Supabase project, database row data is insufficient. You MUST manually re-configure:
- **Authentication**: JWT Settings, Site URL, Redirect URIs, and external OAuth Providers.
- **Storage Buckets**: You must manually create the `invitations_assets` bucket (and set it to Public) in the new project BEFORE restoring storage database metadata or object bytes.
- **API Keys**: Retrieve the new `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` and inject them into the deployment environment (e.g., Vercel).

### 2.4 Final Restore Sequence
When conducting a Full-System Recovery:
1. Restore Application DB state (`public`, `auth` data).
2. Manually configure Provider settings (Auth URLs, Storage buckets).
3. Restore Storage DB metadata (`storage` data) if necessary.
4. Restore Storage object bytes via `rclone`.
5. Run the consistency checker and smoke tests.

---

## 3. Post-Recovery Validation
After executing DB or Storage restoration:
1. Run the Playwright E2E suite (`npm run test:e2e`) against the staging or production environment.
2. Verify that existing published invitations (`/[slug]`) load their assets and template data correctly.
3. Confirm that the RSVP quota limits remain uncorrupted by attempting a test RSVP submission.

**End of Runbook**
