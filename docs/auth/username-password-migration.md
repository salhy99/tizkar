# TIZKAR Auth Migration: Username + Password

## Architecture

### Previous Model (OTP)
- User enters phone number
- Server generates OTP, stores hash in `otp_requests` table
- SMS sent via OTPIQ
- User enters OTP code
- Server verifies hash, creates Supabase session via synthetic email (`<phone>@tidkar.local`)

### New Model (Username/Password)
- User enters username + password
- Server normalizes username, resolves internal auth email (`<username>@auth.tizkar.internal`)
- Authenticates via `supabase.auth.signInWithPassword()`
- Supabase manages session, password hashing, and refresh tokens

## Username Resolution

```
username → normalize(trim + lowercase) → <username>@auth.tizkar.internal → Supabase Auth
```

The internal email is **never exposed** to the browser. All resolution happens in Server Actions.

## Database Changes

### New Migration: `20260904000000_add_username_to_profiles.sql`
- Adds `username TEXT` column to `profiles`
- Creates `UNIQUE INDEX idx_profiles_username_lower ON profiles(lower(username))`

### OTP Infrastructure
- `otp_requests` table: **RETAINED** (not dropped yet)
- `increment_otp_attempt` function: **RETAINED**
- Both marked for future deprecation after Production cutover

## Security

- Passwords managed entirely by Supabase Auth (bcrypt)
- No plaintext passwords stored or logged
- Generic error messages prevent username enumeration
- Rate limiting via Upstash Redis (5 attempts / 15 min per IP:username)
- `auth.users` never queried from browser
- `service_role` never exposed to client
- Registration uses `admin.createUser()` server-side with `email_confirm: true`

## Legacy User Migration Strategy

**OPTION C — Admin-Assisted Migration** (appropriate for current small user base)

Existing users authenticated via `<phone>@tidkar.local` synthetic emails.
New users will use `<username>@auth.tizkar.internal`.

For legacy accounts:
1. Admin creates username via profiles table
2. Admin sets password via Supabase Dashboard or Admin API
3. User logs in with new username/password

## OTP Removal Checklist

| Component | Status |
|---|---|
| Login UI (phone/OTP form) | ✅ REMOVED |
| Login Server Action (sendLoginOtp/verifyLoginOtp) | ✅ REMOVED |
| Registration (auto-signup via OTP verify) | ✅ REPLACED |
| `src/lib/auth/otp-provider.ts` | ⚠️ FILE RETAINED (no runtime imports) |
| `otp_requests` table | ⚠️ RETAINED (future drop migration) |
| OTPIQ SDK calls | ✅ NO RUNTIME PATH |
| SMS env vars | ⚠️ DEPRECATED in .env.example |
| Supabase Phone Auth provider | ⏳ DISABLE AFTER PRODUCTION CUTOVER |

## Rollback Plan

1. Revert `src/actions/auth.ts` to OTP version
2. Revert `src/app/login/page.tsx` to OTP version
3. Phone OTP infrastructure remains intact in DB
4. No destructive changes to roll back

## Production Release Stages

1. Apply `20260904000000` username migration to Production
2. Provision admin accounts with usernames/passwords
3. Deploy application with username/password login
4. Verify login/register/signout flows
5. Disable Supabase Phone Auth provider
6. Drop `otp_requests` table (future migration)
7. Delete `otp-provider.ts` file
