# Tizkar Storage Snapshot Certification Runbook

## Phase V: First Real Snapshot Certification Plan

This document outlines the operational steps required to certify the production deployment of the Immutable Storage Snapshot architecture. **DO NOT** declare certification until all steps are successfully executed in the production environment by an authorized operator.

### Prerequisites
- Code merged to `main` and deployed.
- Access to GitHub Actions (`production` environment).
- Access to Cloudflare R2 dashboard (optional, for manual verification).

### Execution Sequence

#### 1. Execute Production Storage Snapshot
1. Navigate to **GitHub Actions**.
2. Select the **Production Storage Snapshot** workflow.
3. Click **Run workflow** (ensure the branch is `main`).
4. Monitor the execution logs. Wait for completion.

#### 2. Capture and Verify Snapshot Metadata
1. Upon successful workflow completion, open the **Execute Snapshot** step logs.
2. Locate the `=== SNAPSHOT SUMMARY ===` section.
3. Note down the exact `SNAPSHOT_ID`.
4. Verify the following output fields:
   - `STATE`: Must be `COMPLETE`.
   - `OBJECTS_DISCOVERED`: Should be > 0.
   - `TOTAL_BYTES_LOGICAL`: Should be > 0.
   - `MANIFEST_SHA256`: Must be populated.

#### 3. Execute Read-Only Restore Drill
1. Navigate back to **GitHub Actions**.
2. Select the **Production Storage Restore Drill** workflow.
3. Click **Run workflow** (ensure the branch is `main`).
   *(Note: Ensure the restore drill script is updated to accept a Snapshot ID, or manually pass it as a workflow input).*
4. Monitor the execution logs.

#### 4. Verify Drill Results
1. Open the **Execute Drill** step logs.
2. Verify that the drill explicitly selected the verified synthetic sample (`synthetic/restore-drill-v1/sample.png`).
3. Confirm that **NO** customer media was downloaded or verified during this automated drill.
4. Verify the output states:
   - `PASS`: Verified 68 bytes.
   - `Hash`: `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`
5. Verify that the disposable `.storage_restore` directory was successfully cleaned up.

#### 5. Record Certification Evidence
1. Save the GitHub Action run URLs for both the Snapshot and Restore workflows.
2. Record the `SNAPSHOT_ID` and `MANIFEST_SHA256` in the internal compliance tracker.
3. Update the architecture status to `SNAPSHOT_RESTORE_VERIFIED`.

---
**CRITICAL WARNING:**
Do not execute a full source-bucket restore into Production. The system is currently certified for `BEST_EFFORT_MIRROR_RECOVERY` bounded to synthetic files. Full DR certification requires separate end-to-end database and application state recovery validation.
