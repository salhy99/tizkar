# TIZKAR E2E TEST ENVIRONMENT CONTRACT

To execute the Playwright E2E suite against a Development environment, the following environment variables MUST be provided in your `.env.local` or CI environment:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

**SECURITY WARNING**: Never expose actual values in documentation, and NEVER use Production secrets or the Production Project ID (`hnjfxdyterpbmkisaiiw`) in test environments. E2E tests are configured to fatally abort if a production target is detected.
