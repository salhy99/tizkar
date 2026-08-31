# Storage Backup Architecture

## Overview
TIZKAR uses Supabase Storage (`invitations_assets`) for media hosting. PostgreSQL logical backups do *not* protect these object bytes. 
This document defines the architecture for media storage backup and disaster recovery.

## Architecture
1. **Source**: Supabase `invitations_assets` (Private Bucket).
2. **Provider**: Provider-neutral `StorageSourceAdapter`.
3. **Destination**: Provider-neutral `StorageDestinationAdapter` (Currently mapped to LocalFs for Phase 10.2-D-A, designed for S3-compatible endpoints in production).
4. **Execution**: Node.js script (`scripts/storage-backup.ts`) running asynchronously, independent of the customer conversion journey.

## Algorithm
- **Incremental**: The script lists all objects from the source. It compares existence and size against the destination. 
- **Idempotency**: If the object exists and sizes match, it skips the object. 
- **Checksums**: Local filesystem destination calculates SHA-256 for copied objects.
- **Resumability**: Failure on one object skips to the next; rerunning the script naturally resumes missing items.

## Security Model
- **Credentials**: Uses Server/Service Role only. 
- **NO PUBLIC URLS**: Files are never made public for backup purposes.
- **Environment Boundaries**: `production` environments backup namespace is strictly isolated.

## Retention and Deletion
- **Append-Only Policy**: If a source object is deleted (by accident or orphan scan), the backup is **RETAINED**. Backup-side deletion requires a separate expiration policy.

## Disaster Recovery Health Status
- **LEVEL 1**: Architecture defined, development restore proven. (Current State)
- **LEVEL 2**: Production scheduled and recurring. (Next Step)
- **LEVEL 3**: Full production restore drill proven. 
