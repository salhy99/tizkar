# Disaster Recovery Runbook

## Overview
This runbook defines recovery procedures for the TIZKAR platform's data layers, specifically PostgreSQL (database) and Supabase Storage (media objects).

## Recovery Objectives
- **RPO (Recovery Point Objective)**: ~24 hours (based on nightly backup schedules).
- **RTO (Recovery Time Objective)**: 
  - Single Object: < 15 minutes.
  - Large-Scale Restore: Dependent on volume and egress rates, estimated ~1-4 hours.

## Disaster Scenarios

### Scenario 1: Single Image Deleted
**Symptom:** A customer or the application accidentally deletes a referenced image.
**Action:**
1. Identify the object key (`legacy/<id>/...` or `anon/<id>/...`).
2. Run `npx tsx scripts/storage-restore.ts <object-key>`.
3. Verify the object is restored in the Supabase Dashboard.
4. Verify the invitation renders correctly.

### Scenario 2: Whole Bucket Wiped
**Symptom:** Entire `invitations_assets` bucket is emptied.
**Action:**
1. Prevent public application writes (activate maintenance mode).
2. Write a bulk orchestration script utilizing `scripts/storage-restore.ts` logic to loop over all manifest items in the backup destination.
3. Validate restored checksums.
4. Run Consistency Checker (Development).
5. Disable maintenance mode.

### Scenario 3: Database & Storage Catastrophic Loss
**Symptom:** Entire Supabase project deleted.
**Action:**
1. Provision new Supabase project infrastructure.
2. Restore PostgreSQL logical backup FIRST.
3. Restore Storage objects via bulk orchestration script.
4. Update DNS/Vercel ENV vars to point to new project.

## Dependency Map
| Data | Recovery Source |
|---|---|
| Invitations | PostgreSQL backup |
| Invitation versions | PostgreSQL backup |
| Orders | PostgreSQL backup |
| RSVP | PostgreSQL backup |
| Funnel events | PostgreSQL backup / policy |
| Admin audit | PostgreSQL backup |
| Images | Storage backup |
| Audio | Storage backup |
