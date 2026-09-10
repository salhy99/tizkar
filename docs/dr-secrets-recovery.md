# Disaster Recovery: Secrets & Configuration Recovery

This document outlines the critical secrets and environment configurations required to rebuild TIZKAR from scratch.

> **CRITICAL**: Do NOT store actual secret values in this document or in Git.

## Required Secrets Inventory

### Supabase Core
| Secret Name | Source of Truth | Who Can Recover | Rotation Procedure | Recovery Target | Can Regenerate |
|-------------|----------------|-----------------|--------------------|-----------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | Admin | N/A (URL change requires code update) | Vercel | Yes (new project) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard | Admin | Dashboard Rotation | Vercel | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | Admin | Dashboard Rotation | Vercel, GH Actions | Yes |

### Storage Backup (Cloudflare R2)
| Secret Name | Source of Truth | Who Can Recover | Rotation Procedure | Recovery Target | Can Regenerate |
|-------------|----------------|-----------------|--------------------|-----------------|----------------|
| `BACKUP_S3_ACCESS_KEY_ID` | Cloudflare Dashboard | Admin | Revoke & Issue | GH Actions | Yes |
| `BACKUP_S3_SECRET_ACCESS_KEY`| Cloudflare Dashboard | Admin | Revoke & Issue | GH Actions | Yes |
| `RESTORE_S3_ACCESS_KEY_ID` | Cloudflare Dashboard | Admin | Revoke & Issue | GH Actions | Yes |
| `RESTORE_S3_SECRET_ACCESS_KEY`| Cloudflare Dashboard | Admin | Revoke & Issue | GH Actions | Yes |

### Other Configurations
| Config Name | Source of Truth | Who Can Recover | Rotation Procedure | Recovery Target | Can Regenerate |
|-------------|----------------|-----------------|--------------------|-----------------|----------------|
| `OTP_HASH_SECRET` | Secure Vault | Admin | Application Config | Vercel | No (will break existing OTPs) |

## Recovery Principles
1. **GitHub/Vercel are not sources of truth**. Always refer to a secure vault or generate new keys directly from the provider.
2. **Never commit `.env.production`**.
3. **Validate before bind**. Ensure all keys match the designated isolated DR environment before testing.
