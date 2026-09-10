# Storage Certification Runbook

## Overview
This runbook details the procedures for executing and verifying storage snapshots and restoration drills within the TIZKAR production environment. It ensures compliance with disaster recovery protocols and safe handling of production data.

## Phase 1: Snapshot Generation & Validation
1. **Trigger Snapshot**:
   - The scheduled backup runs daily at `01:00 UTC` via GitHub Actions (`Production Storage Snapshot`).
   - Manual triggers must use `workflow_dispatch`. `ALLOW_EMPTY_SOURCE` must remain `false` unless explicitly diagnosing an empty bucket.
2. **Verify Output**:
   - The workflow emits a health summary.
   - Assert `STATE` is `COMPLETE`.
   - Assert `OBJECTS_DISCOVERED` > 0 (unless specifically overriding empty sources).
   - Record the `SNAPSHOT_ID` and `MANIFEST_SHA256` for audit.

## Phase 2: Read-Only Restore Drill (Monthly)
*Restore drills should be executed on a Monthly cadence using restricted read-only credentials.*

1. **Prerequisites**:
   - Identify the `SNAPSHOT_ID` from the latest successful backup.
   - Use the `restore-drill` environment.
   - Ensure credentials injected are strictly `RESTORE_S3_ACCESS_KEY_ID` (Read-Only). No `NEXT_PUBLIC_SUPABASE_URL` or production DB credentials should be present.
2. **Execute Drill**:
   - Run `npx tsx scripts/storage-restore-drill.ts`.
   - The drill will automatically select bounded synthetic/test samples (max 5 objects, 25MB total).
   - If no synthetic objects exist, the drill will safely abort.
3. **Verify Integrity**:
   - Confirm `RESTORE_HASH_MISMATCHES: 0`.
   - Confirm `RESTORE_SIZE_MISMATCHES: 0`.
   - Ensure the temporary download directory `.storage_restore` is successfully cleaned up (`RESTORE_CLEANUP_RESULT: PASS`).

## Phase 3: Immutability Verification
- TIZKAR employs `APPLICATION_ENFORCED_IMMUTABILITY`.
- Storage backup credentials are intentionally scoped without `s3:DeleteObject` permissions for the primary snapshot archive.
- Ensure that the retention garbage collection runs via a separate, highly privileged IAM user, not the backup orchestrator.

## Alerting and Incident Response
- Any failure in the snapshot workflow triggers an immediate alert via GitHub Actions.
- Incomplete snapshots will not overwrite existing valid snapshots due to content-addressed UUID tracking and unique Snapshot IDs.
- In case of silent empty snapshots, the `Fail Closed` guard will intentionally fail the workflow, requiring SRE intervention.
