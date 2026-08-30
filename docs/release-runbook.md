# TIZKAR RELEASE RUNBOOK

## 1. Scope
This document standardizes the deployment procedure for Tizkar application updates, distinguishing between Code-Only releases and Schema/Data Migration releases.

## 2. Release Types
- **Code-Only Release**: Changes strictly confined to the application codebase (e.g., UI updates, logic changes, feature additions that do not modify the database schema).
- **Migration Release**: Changes involving Database Schema updates, Policy changes (RLS), or additive Data Migrations.

## 3. Pre-Release Checklist (Quality Gates)
Before any deployment, the release candidate MUST pass the following automated gates:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```
*Note: Any failure is an immediate deployment blocker.*

## 4. Code-Only Release Procedure
1. **Verify State**: Confirm working tree is clean and `main` is checked out.
2. **Review Diff**: Ensure `git diff <PRODUCTION_SHA>..<RELEASE_SHA>` contains no unexpected mutations.
3. **Commit & Push**: Push the `RELEASE_SHA` to the `main` branch.
4. **Deploy**: Vercel automatically deploys pushes to `main`.
5. **Verify**: Visit the deployment URL and execute the non-destructive smoke suite.

## 5. Migration Release Procedure
1. **Backup Gate**: Verify a recent Supabase Logical Backup exists (daily snapshot). 
2. **Dry Run**: Apply the migration to the Development Database first using `supabase db push`.
3. **Smoke Test (Dev)**: Ensure development is healthy post-migration.
4. **Deploy Migration**: Apply migration to Production Supabase.
5. **Deploy Code**: Push the paired code changes to `main`.
6. **Verify**: Execute the non-destructive smoke suite in Production.

## 6. Rollback Procedure
If a release causes a P0 incident:
1. Navigate to the Vercel Dashboard -> Tizkar project.
2. Identify the previous stable deployment (the `PRODUCTION_SHA`).
3. Click "Instant Rollback" to immediately route traffic back to the stable build.
4. If a schema migration was involved, *do not roll back the database* unless absolutely necessary to prevent data corruption. Most application rollbacks should remain code-only.
