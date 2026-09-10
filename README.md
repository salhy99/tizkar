# TIZKAR

## Overview

TIZKAR is a modern digital invitations platform designed for seamless creation, customization, and management of luxury digital invitations. It supports both anonymous and authenticated creation flows, a private editor ownership model, rich media storage capabilities, and a full admin/payment/publish pipeline.

## Core User Journey

1. **Choose Template**: Select from premium templates like Rose Garden or Modern Glass.
2. **Create Invitation**: Initialize a new draft.
3. **Customize**: Edit content and layout via the Editor interface.
4. **Autosave**: Changes are safely auto-saved.
5. **Upload Media**: Upload images and audio securely.
6. **Submit / Package**: Choose a package and submit for review.
7. **Payment Review**: Operator reviews payment requests.
8. **Admin Confirmation**: Admin confirms payment.
9. **Publish**: The invitation becomes publicly accessible.
10. **Share & RSVP**: Guests receive the link and can RSVP.

## Architecture

- **Frontend & Framework**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage for private media assets, Cloudflare R2 for backups
- **CI/CD & Automation**: GitHub Actions for scheduled backups and CI checks
- **Testing**: Vitest (Unit) and Playwright (E2E)

## Authentication & Ownership

TIZKAR uses an anonymous Editor Session model via a Secret Edit Token stored as an `HttpOnly` cookie. This enables frictionless guest-level editing while keeping drafts private. A legacy authenticated owner support flow is also maintained. Admins authenticate via secure routes using standard Supabase server auth for payment approvals.

## Storage Architecture

Media is stored in a private Supabase bucket (`invitations_assets`). Server-side access validation is enforced. Users can upload media which is securely linked to their session/invitation token.

## Backup & Disaster Recovery

- **Database Backup**: Periodic `.dump` backups to R2. DB restore is verified.
- **Legacy Storage Mirror**: Scheduled copying of files to R2 mirror. Legacy mirror restore is verified.
- **Legacy Mirror Restore Drill**: Automated drill to prove mirror consistency.
- **Immutable Storage Snapshot Architecture**: Content-addressed snapshot model. 
- **Disaster Recovery Documentation**: 
  - [Full DR Runbook](docs/full-dr-runbook.md)
  - [DR Certification](docs/dr-certification.md)
  - [DR Secrets Recovery](docs/dr-secrets-recovery.md)
  - [DR Scenarios](docs/dr-scenarios.md)

## Storage Snapshot Model

- **Model**: Content-addressed objects with deterministic manifests.
- **Manifest**: Uses a signed `manifest.sha256` for integrity.
- **Consistency**: `VERIFIED_LOGICAL_SNAPSHOT_OVER_CAPTURE_WINDOW` (Point-in-time is not atomic across all objects).
- **ATOMIC_POINT_IN_TIME_GUARANTEE**: NO
- **Status Types**: COMPLETE, FAILED, INCOMPLETE.

## Development Setup

1. **Install dependencies**: `npm install` (or `npm ci`)
2. **Environment Variables**: Copy `.env.example` to `.env.local` and populate required fields.
3. **Run Dev Server**: `npm run dev`
4. **Tests**:
   - Unit: `npm run test`
   - E2E: `npm run test:e2e`
5. **Quality Gates**: `npm run lint` && `npm run typecheck` && `npm run build`

## Environment Variables

- Application: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL`
- Supabase (Server-only): `SUPABASE_SERVICE_ROLE_KEY`
- R2 Backup (Server-only): `BACKUP_S3_ENDPOINT`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION`
- Development (Optional): `PORT`

*Never commit actual values for these variables.*

## Testing

- **Unit/Integration**: Handled by Vitest.
- **E2E**: Playwright tests covering Golden Path, Authentication, Storage, Recovery, and Security.

## CI/CD

Relevant GitHub Actions workflows include:
- `storage-snapshot.yml`: Production Immutable Storage Snapshot.
- `storage-backup.yml`: Legacy Storage Mirroring.
- `storage-restore-drill.yml`: Read-only validation of storage backups.
- `database-backup.yml`: Daily database dumping to R2.

## Production Safety

- Do not run restore workflows casually on production.
- Read-only restore drills are preferred for routine verification.
- The storage snapshot workflow remains manual until fully certified for scheduling.
- **No secrets in logs**: Ensure workflows mask credentials.

## Repository Structure

```
├── .github/workflows/    # CI/CD pipelines
├── scripts/              # Backup and DR scripts
├── src/
│   ├── actions/          # Server actions
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable React components
│   └── lib/              # Core logic, auth, storage, database helpers
├── supabase/             # Migrations and configurations
└── tests/                # Vitest and Playwright test suites
```

## Security

- **Never** expose service-role keys or commit `.env` files.
- Storage buckets assume a private model; any public exposure happens via explicit signed URLs or proxy routes.
- The platform follows least-privilege principles for user roles and RLS policies.