import { cookies } from 'next/headers';
import crypto from 'crypto';

export const EDITOR_SESSION_PREFIX = 'tzk_editor_session_';
export const TOKEN_PREFIX = 'tzk_';
export const RECOVERY_PREFIX = 'TZK-RCV-';

export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const formatted = `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}`
  return `${RECOVERY_PREFIX}${formatted}`
}

export function normalizeRecoveryKey(input: string): string {
  let normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (normalized.startsWith('TZKRCV')) {
    normalized = normalized.substring(6)
  }
  if (normalized.length === 16) {
    const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}`
    return `${RECOVERY_PREFIX}${formatted}`
  }
  return input.toUpperCase().trim()
}

export function hashRecoveryKey(key: string): string {
  const normalized = normalizeRecoveryKey(key)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Generates a cryptographically secure random edit token.
 */
export function generateEditToken(): string {
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${TOKEN_PREFIX}${randomBytes}`;
}

/**
 * Creates a SHA-256 hash of the given token to store in the database.
 */
export function hashEditToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Establishes a secure server-side HttpOnly cookie for the editor session.
 */
export async function setEditorSession(invitationId: string, token: string) {
  const cookieStore = await cookies();
  const cookieName = `${EDITOR_SESSION_PREFIX}${invitationId}`;
  
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/`,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Reads the secure Editor Session cookie for a specific invitation.
 */
export async function getEditorSession(invitationId: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookieName = `${EDITOR_SESSION_PREFIX}${invitationId}`;
  return cookieStore.get(cookieName)?.value;
}

/**
 * Clears the Editor Session cookie.
 */
export async function clearEditorSession(invitationId: string) {
  const cookieStore = await cookies();
  const cookieName = `${EDITOR_SESSION_PREFIX}${invitationId}`;
  cookieStore.delete(cookieName);
}

/**
 * Authoritative server-side function to verify if the current request has Editor access to the given invitation.
 */
export async function requireInvitationEditorAccess(invitationId: string) {
  // 1. Check for Editor Session Cookie
  const sessionToken = await getEditorSession(invitationId);
  if (!sessionToken) {
    return null; // Missing session
  }

  // 2. Validate token format strictly (tzk_ + 43 base64url chars = 47 chars)
  const tokenRegex = /^tzk_[A-Za-z0-9_-]{43}$/;
  if (!tokenRegex.test(sessionToken)) {
    return null; // Malformed token
  }

  // 3. Hash the provided token
  const tokenHash = hashEditToken(sessionToken);

  // 4. Verify against database using Service Role to bypass RLS for token check
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inv, error } = await adminClient
    .from('invitations')
    .select('id, user_id, status, edit_token_hash')
    .eq('id', invitationId)
    .single();

  if (error || !inv || !inv.edit_token_hash) {
    return null; // Not found or no hash exists (NULL hash must deny access)
  }

  // 5. Check if the hash matches using constant-time comparison to prevent timing attacks
  const dbHashBuffer = Buffer.from(inv.edit_token_hash, 'hex');
  const providedHashBuffer = Buffer.from(tokenHash, 'hex');

  if (dbHashBuffer.length !== providedHashBuffer.length || !crypto.timingSafeEqual(dbHashBuffer, providedHashBuffer)) {
    return null; // Token mismatch
  }

  // Session belongs to that exact invitation and is verified
  return inv;
}
