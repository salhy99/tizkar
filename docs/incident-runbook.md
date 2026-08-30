# TIZKAR INCIDENT RUNBOOK

## 1. Scope
This runbook covers critical operational incidents for the Tizkar platform. It defines steps for detection, containment, and recovery.

## 2. General Incident Flow
1. **Detect**: Observe alerts from Vercel/Supabase or user reports.
2. **Contain**: Implement temporary mitigations (e.g., locking access, reverting deployments).
3. **Rollback**: If a code change caused the incident, use Vercel "Instant Rollback".
4. **Verify**: Ensure the mitigation or rollback has stabilized the system.
5. **Recover**: Address the root cause in development and deploy a permanent fix.

## 3. Specific Scenarios

### 3.1. Vercel Outage
- **Detect**: 5xx errors widespread, Vercel Status page indicates downtime.
- **Contain**: If edge routing is down, communicate via social channels. No direct platform mitigation available.
- **Recover**: Wait for Vercel resolution.
- **Verify**: Monitor Vercel Status and ping `https://tizkar.vercel.app`.

### 3.2. Supabase Outage (Database / Auth)
- **Detect**: Authentication failures, data fetching errors.
- **Contain**: Applications will degrade gracefully (Next.js static pages remain up). 
- **Recover**: Wait for Supabase resolution.
- **Verify**: Ensure users can log in once resolved.

### 3.3. Media Storage Outage
- **Detect**: Media uploads fail, images return 500 errors.
- **Contain**: The application displays empty states or placeholders.
- **Recover**: Investigate Supabase Storage logs. If malicious load, block IPs via Upstash rate limits.
- **Verify**: Perform a test upload.

### 3.4. Payment Issue (Manual Transfers)
- **Detect**: Orders stuck in PENDING_PAYMENT, users complaining about unconfirmed transfers.
- **Contain**: Escalate to the billing admin team immediately.
- **Recover**: Admin logs into `/admin/orders` to manually cross-reference bank transfers and confirm orders.
- **Verify**: Ensure the user gains access to PLUS/PREMIUM features.

### 3.5. Credential Exposure
- **Detect**: A leaked `SUPABASE_SERVICE_ROLE_KEY` or Edit Token is identified.
- **Contain**: Immediately rotate the `SUPABASE_SERVICE_ROLE_KEY` in the Supabase Dashboard and update the Vercel Environment Variable.
- **Recover**: For Edit Tokens, invalidate the token or assist the user in using their Recovery Key to generate a new token.
- **Verify**: Confirm the leaked credential no longer grants access.

### 3.6. Data Incident
- **Detect**: Unauthorized modifications or data loss detected.
- **Contain**: Lock down the affected invitation or user account. Revert any malicious code changes.
- **Recover**: Use the latest Supabase Logical Backup (Point-in-Time Recovery if available) to restore the damaged rows.
- **Verify**: Confirm data integrity and ensure the vulnerability is patched.
