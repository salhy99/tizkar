# Full System Disaster Recovery Runbook

## Overview
This runbook describes the end-to-end recovery sequence for TIZKAR from a catastrophic total-loss scenario (Scenario 8). It explicitly details how to restore the database, storage, application configuration, and verify total systemic integrity in an isolated DR environment.

## Phase 1: Pre-Flight & Environment Isolation
1. **Trigger DR Workflow**:
   - Manually trigger `.github/workflows/full-dr-drill.yml` targeting the `dr-drill` environment.
   - Or, follow manual steps.
2. **Environment Isolation Validation**:
   - Verify that the target Supabase project is a temporary DR project.
   - Run guard check to ensure no production URL is configured.

## Phase 2: Database Recovery
1. **Identify Backup**:
   - Locate the verified PostgreSQL backup in R2.
2. **Restore Execution**:
   - Provision isolated Supabase DB.
   - Execute restore script.
3. **Database Post-Restore Verification**:
   - Run `scripts/dr-crosscheck.ts` to verify schema, auth.users, profiles, admins, and foreign-key integrities.
   - Ensure Auth compatibility.

## Phase 3: Storage Recovery
1. **Identify Snapshot**:
   - Locate the most recent `COMPLETE` Storage Snapshot manifest in R2.
2. **Restore Execution**:
   - Restore using `scripts/storage-restore-drill.ts` or a full snapshot restore script against the isolated target bucket.
3. **Storage Verification**:
   - Verify byte counts and SHA-256 matches for the restored files.

## Phase 4: Database/Storage Cross-Check
- Execute `scripts/dr-crosscheck.ts` (crosscheck mode) to verify that all database media references point to existing objects in the restored storage bucket, and identify missing/orphaned media.

## Phase 5: Application Deployment & Smoke Tests
1. **Deployment**:
   - Deploy `main` branch to a temporary Vercel project (e.g., `tizkar-dr-test`).
   - Bind environment variables from the DR Supabase project.
2. **Smoke Testing**:
   - Verify landing page loads.
   - Verify login works.
   - Verify media loads.
   - Execute security sanity checks (e.g., draft access protection).

## Phase 6: Sign-off & Cleanup
- Generate Evidence Report.
- DO NOT automate destruction of the DR environment. Wait for explicit Operator Approval.
- Confirm RTO/RPO targets were met.
