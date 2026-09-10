# Storage Retention Design

## Objective
Define a robust, conservative retention policy for TIZKAR's production storage backups (snapshots) in Cloudflare R2 to optimize costs while ensuring compliance and disaster recovery capabilities.

## Policy Configuration
- **Daily Snapshots**: Keep for **30 days**. Provides granular point-in-time recovery for recent events.
- **Weekly Snapshots**: Keep for **12 weeks**. One representative snapshot per week is preserved for medium-term recovery.
- **Monthly Snapshots**: Keep for **12 months**. One representative snapshot per month is preserved for long-term auditing and compliance.

## Implementation Details
1. **Categorization Mechanism**:
   - The retention script parses the `started_at` timestamp of all `COMPLETE` snapshots.
   - It identifies the most recent snapshot for each day, week, and month.
   - Snapshots falling outside these representative slots or exceeding the maximum age limits are marked as `EXPIRED`.
   - `FAILED` or incomplete snapshots are not retained for the long term and are marked for immediate deletion.
2. **Dry-Run Default**:
   - The system is currently in **DRY-RUN** mode. The retention script classifies snapshots and logs the actions (`RETAIN` or `DELETE`) without performing any destructive operations on R2.
3. **Immutability**:
   - The retention system enforces `APPLICATION_ENFORCED_IMMUTABILITY`. Currently, no cloud-provider-level locks (e.g., R2 Object Lock) are active. The backup credentials only possess write access and no delete permissions on production data paths.

## Future Scope (Garbage Collection)
Once the retention classification is verified over a sufficient operational period, Garbage Collection (GC) will be enabled in a separate certification phase. GC will involve a separate IAM credential restricted strictly to deleting objects marked `EXPIRED`.
