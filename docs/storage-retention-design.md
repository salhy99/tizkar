# Tizkar Storage Snapshot Retention & Garbage Collection Design

## Objective
To define a retention policy that preserves recent and historical points-in-time while safely removing unreferenced content-addressed objects to manage storage costs.

## Retention Policy Requirements
1. **Snapshots**:
   - Keep daily snapshots for the last 30 days.
   - Keep weekly snapshots for the last 12 weeks.
   - Keep monthly snapshots indefinitely or for an extended period.
2. **Content-Addressed Objects (`objects/<sha256>`)**:
   - An object must be retained if it is referenced by **any** retained snapshot manifest.
   - An object can only be deleted if it is not referenced by any retained manifest.

## Garbage Collection Algorithm (Dry-Run First)
Garbage collection (GC) should follow a multi-phase verification process:
1. **Identify Retained Manifests**: Enumerate all `status.json` and `manifest.json` files that match the retention criteria.
2. **Build Referenced Set**: Parse all retained `manifest.json` files to extract a Set of `sha256` keys representing all actively used objects.
3. **Enumerate Object Store**: List all keys under the `objects/` prefix in the R2 bucket.
4. **Identify Orphans**: Any object under `objects/` that is not present in the Referenced Set is considered an orphan.
5. **Grace Period**: Filter out orphaned objects created within the last 7 days to protect ongoing snapshots or delayed operations.
6. **Execution (Dry-Run)**: By default, the GC script only logs orphaned objects.
7. **Deletion**: Upon operator approval, the script issues `DeleteObjects` commands for the orphaned objects.

## Important Safeguards
- **Never delete if manifest parsing fails**: If any manifest fails to download or parse, abort GC.
- **Atomic operations**: Do not delete a snapshot manifest until its retention period expires.
- **Failed Snapshots**: `FAILED` or `INCOMPLETE` snapshots older than 7 days should be purged, including their orphaned objects.
