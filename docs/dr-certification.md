# Disaster Recovery Certification Requirements

To confidently declare TIZKAR as `FULL_DR_CERTIFIED`, a comprehensive, isolated recovery drill must pass all the following conditions. 

## 1. Prerequisites
- [ ] Documented Secrets Recovery Procedure exists (`docs/dr-secrets-recovery.md`).
- [ ] No secrets are stored in Git.
- [ ] Production Guard is implemented to reject accidental restoration to live environments.

## 2. Database Recovery
- [ ] Backup verified.
- [ ] Restore executed into isolated DR DB.
- [ ] Database Post-Restore Verifier confirms counts and schema integrity (Auth, Profiles, Admin, Invitations).

## 3. Storage Recovery
- [ ] Primary recovery source is a verified Storage Snapshot.
- [ ] Content-addressed files successfully recovered.
- [ ] Hashes and file sizes perfectly match the verified manifest.

## 4. Integration & Cross-Check
- [ ] Database/Storage cross-check tool executes successfully without missing required media.

## 5. Application Deployment
- [ ] Temporary Vercel DR environment successfully provisioned.
- [ ] Application binds to DR Database and DR Storage correctly.

## 6. Functional & Security Validation
- [ ] **Auth Smoke Tests**: Users can authenticate, refresh sessions.
- [ ] **Application Smoke Tests**: Landing page, dashboard, draft and public invitations load successfully.
- [ ] **Security Smoke Tests**: RLS policies enforce correctly; service role is not leaked.

## 7. Metrics & Evidence
- [ ] Actual RTO measured and within limits (Target: <4 hours).
- [ ] Estimated RPO documented.
- [ ] Comprehensive Recovery Evidence generated and logged (without secrets).
- [ ] Production Data, Database, DNS, and Storage explicitly remained completely untouched during the drill.

If any above condition fails, the certification fails (`FULL_DR_CERTIFIED: NO`).
