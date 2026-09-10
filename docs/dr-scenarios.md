# Disaster Recovery Scenarios

This document outlines the theoretical scenarios designed for full system recovery of TIZKAR.

## SCENARIO 1: Application deployment lost, DB/Storage intact
- **IMPACT**: Front-end down.
- **RECOVERY_SOURCE**: Git main branch.
- **RECOVERY_SEQUENCE**: Redeploy to Vercel, rebind env vars.
- **RTO_TARGET**: 1 hour.
- **RPO_TARGET**: N/A (no data lost).
- **MANUAL_STEPS**: Deploy via Vercel dashboard.
- **AUTOMATED_STEPS**: Vercel CI build.
- **SUCCESS_CRITERIA**: Site resolves successfully.

## SCENARIO 2: Supabase database lost, Storage intact
- **IMPACT**: Complete platform unavailability, data loss.
- **RECOVERY_SOURCE**: R2 Postgres Backup.
- **RECOVERY_SEQUENCE**: Provision new Supabase DB -> run DB restore -> cross-check -> repoint app.
- **RTO_TARGET**: 2 hours.
- **RPO_TARGET**: <= 24 hours.
- **MANUAL_STEPS**: Provision new Supabase project.
- **AUTOMATED_STEPS**: GitHub Action DB restore.
- **SUCCESS_CRITERIA**: Users can log in, data verified.

## SCENARIO 3: Supabase Storage lost, DB intact
- **IMPACT**: Missing media, corrupted invitations.
- **RECOVERY_SOURCE**: Storage Snapshot on R2.
- **RECOVERY_SEQUENCE**: Provision new bucket -> restore snapshot -> cross-check.
- **RTO_TARGET**: 3 hours.
- **RPO_TARGET**: <= 24 hours.
- **MANUAL_STEPS**: Provision bucket.
- **AUTOMATED_STEPS**: Snapshot restore execution.
- **SUCCESS_CRITERIA**: Media URLs load successfully.

## SCENARIO 4: Supabase project fully lost (DB + Auth + Storage)
- **IMPACT**: Complete platform loss.
- **RECOVERY_SOURCE**: R2 Postgres Backup, Storage Snapshot.
- **RECOVERY_SEQUENCE**: Provision project -> restore DB -> restore Storage -> cross-check -> repoint app.
- **RTO_TARGET**: 4 hours.
- **RPO_TARGET**: <= 24 hours.
- **SUCCESS_CRITERIA**: Entire application recovers.

## SCENARIO 5: Vercel project lost
- **IMPACT**: Routing and Frontend down.
- **RECOVERY_SOURCE**: Git main branch, DNS control.
- **RECOVERY_SEQUENCE**: Create new Vercel project -> configure env -> update DNS.
- **RTO_TARGET**: 2 hours.
- **RPO_TARGET**: N/A.

## SCENARIO 6: GitHub Actions secrets lost
- **IMPACT**: Automated backups and deployment fail.
- **RECOVERY_SOURCE**: Secrets management vault (documented).
- **RECOVERY_SEQUENCE**: Rotate secrets -> update GitHub.
- **RTO_TARGET**: 1 hour.
- **SUCCESS_CRITERIA**: Workflows succeed.

## SCENARIO 7: R2 backup credentials lost but backup data intact
- **IMPACT**: Cannot backup or restore.
- **RECOVERY_SOURCE**: Cloudflare dashboard.
- **RECOVERY_SEQUENCE**: Issue new R2 tokens.
- **RTO_TARGET**: 1 hour.
- **SUCCESS_CRITERIA**: Backups resume.

## SCENARIO 8: Total environment loss (Only Git & R2 survive)
- **IMPACT**: Everything is destroyed.
- **RECOVERY_SOURCE**: Git, R2 Backups, Secret Vault.
- **RECOVERY_SEQUENCE**: Provision Supabase -> Restore DB/Storage -> Provision Vercel -> Deploy -> Verify.
- **RTO_TARGET**: 4 hours.
- **RPO_TARGET**: <= 24 hours.
- **SUCCESS_CRITERIA**: TIZKAR is fully restored and operational.
