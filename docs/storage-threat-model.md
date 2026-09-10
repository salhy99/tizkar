# Tizkar Storage Snapshot Threat Model

## 1. Stolen R2 Writer Token
**THREAT**: An attacker gains access to the `BACKUP_S3_ACCESS_KEY_ID` and `BACKUP_S3_SECRET_ACCESS_KEY`.
**CURRENT_CONTROL**: The token is stored securely in GitHub Actions secrets and only exposed to the production environment workflow. It operates with a least-privilege policy allowing only `PutObject` and `ListBucket`.
**REMAINING_RISK**: If compromised, the attacker could upload malicious objects or overwrite unversioned objects (if bucket versioning is disabled).
**RECOMMENDATION**: Enable Cloudflare R2 bucket versioning or object lock policies to prevent `PutObject` overwrites. Restrict token scope to specific IP ranges if supported.

## 2. Malicious Overwrite
**THREAT**: An attacker overwrites an existing content-addressed object `objects/<sha256>` with modified content that produces the same hash (unlikely) or simply forces a blind overwrite.
**CURRENT_CONTROL**: The snapshot writer performs `HeadObject` prior to upload. If the object exists, it skips upload, preventing silent overwrites by the application itself.
**REMAINING_RISK**: An attacker with a direct token could bypass application logic and overwrite directly.
**RECOMMENDATION**: Enforce provider-level WORM (Write Once, Read Many) or bucket object lock. Document this as APPLICATION_ENFORCED_IMMUTABILITY until provider WORM is enabled.

## 3. Manifest Tampering
**THREAT**: The `manifest.json` is modified to point to incorrect or malicious objects.
**CURRENT_CONTROL**: A `manifest.sha256` checksum is calculated deterministically and uploaded. The restore verifier validates this hash against the manifest body before processing.
**REMAINING_RISK**: An attacker who can write to R2 could tamper with BOTH the manifest and the checksum file simultaneously.
**RECOMMENDATION**: Sign manifests using a private key accessible only to the backup job, and verify signatures during restore.

## 4. Hash Collision Assumptions
**THREAT**: Two different files produce the same SHA-256 hash, causing one to overwrite or be ignored in favor of the other.
**CURRENT_CONTROL**: SHA-256 is currently considered cryptographically secure and highly collision-resistant.
**REMAINING_RISK**: Practically zero for non-malicious content, extremely low even for targeted attacks.
**RECOMMENDATION**: Accept the risk, as SHA-256 is the industry standard for content addressing.

## 5. Compromised GitHub Actions Runner
**THREAT**: A malicious dependency or action intercepts the workflow and steals secrets or modifies backup logic.
**CURRENT_CONTROL**: Environment protection rules and explicitly pinned Action versions. Secrets are only injected into the `Execute Snapshot` step.
**REMAINING_RISK**: Supply chain attack on NPM dependencies.
**RECOMMENDATION**: Periodically audit dependencies, use strict `npm ci`, and run dependency vulnerability scanners.

## 6. Exposed Service Role
**THREAT**: The `SUPABASE_SERVICE_ROLE_KEY` is leaked in logs.
**CURRENT_CONTROL**: Workflow does not echo secrets; the script handles generic errors and logs safe codes instead of raw HTTP errors.
**REMAINING_RISK**: Unexpected stack traces could theoretically log environment variables.
**RECOMMENDATION**: Ensure GitHub Actions secret masking is enabled.

## 7. Path Traversal & Crafted Object Paths
**THREAT**: Source objects have keys like `../../malicious.txt`.
**CURRENT_CONTROL**: Supabase Storage normalizes paths. The Restore Verifier uses `path.join` and validates safe paths before restoring.
**REMAINING_RISK**: Minimal, but strict validation is necessary.
**RECOMMENDATION**: Maintain `isSafeStoragePath` validation in the restore verifier.

## 8. Excessive Object Size & Resource Exhaustion
**THREAT**: An attacker uploads a massive file, causing OOM (Out of Memory) during backup.
**CURRENT_CONTROL**: Streaming APIs and array buffers are used. The restore drill enforces `MAX_OBJECT_SIZE`.
**REMAINING_RISK**: Memory spikes if many concurrent large objects are processed.
**RECOMMENDATION**: Continue using bounded concurrency (`CONCURRENCY_LIMIT = 5`). Implement explicit size limits per object.

## 9. Infinite Pagination Loop
**THREAT**: The `listObjects` implementation enters an infinite loop if `data.length === limit` but `offset` logic is flawed.
**CURRENT_CONTROL**: Added robust `hasMore` and offset incrementation logic with explicit termination boundaries.
**REMAINING_RISK**: Supabase API behaving non-deterministically.
**RECOMMENDATION**: Add an absolute `max_iterations` safeguard.

## 10. Restore Into Unintended Bucket
**THREAT**: The restore process inadvertently pushes data to the Production bucket instead of a test workspace.
**CURRENT_CONTROL**: The drill explicitly writes to a local disposable `.storage_restore` directory.
**REMAINING_RISK**: Operator error during manual full restore.
**RECOMMENDATION**: Always use `DRY_RUN` mode by default for full restore scripts.

## 11. Customer Object Path Leakage
**THREAT**: Sensitive customer IDs or invitation keys are leaked in GitHub Actions logs.
**CURRENT_CONTROL**: The script only prints high-level summaries (`TOTAL_BYTES`, `OBJECTS_DISCOVERED`).
**REMAINING_RISK**: None, assuming logs are restricted.
**RECOMMENDATION**: Ensure error messages do not embed raw object keys.

## 12. Destructive Restore
**THREAT**: A restore operation deletes newer objects in the source bucket to match the old snapshot exactly.
**CURRENT_CONTROL**: Restore verification only downloads and hashes. No full source-restore is implemented yet.
**REMAINING_RISK**: Future implementations might assume exact mirror sync.
**RECOMMENDATION**: Any future full restore must default to `RESTORE_MISSING_ONLY` rather than `MIRROR_SYNC`.

## 13. Incomplete Snapshot Falsely Marked Complete
**THREAT**: Network errors cause objects to be skipped, but the snapshot is marked `COMPLETE`.
**CURRENT_CONTROL**: The two-phase orchestrator requires all batch promises to succeed before writing the manifest and `COMPLETE` status.
**REMAINING_RISK**: None identified, as long as `try/catch` boundaries are respected.
**RECOMMENDATION**: Retain the strict two-phase commit model.
