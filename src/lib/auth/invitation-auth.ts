import { createClient } from '../supabase/server';
import { requireInvitationEditorAccess } from './editor-session';

/**
 * Centralized authorization layer for Phase 6.4-B.
 * Evaluates dual authorization:
 * A) Secure Token Editor Session
 * OR
 * B) Legacy Supabase Authenticated Ownership
 */
export async function requireInvitationEditAccess(invitationId: string) {
  // 1. Attempt Token-based Editor Session
  const tokenSessionInv = await requireInvitationEditorAccess(invitationId);
  if (tokenSessionInv) {
    return tokenSessionInv; // Authorized via Token
  }

  // 2. Fallback to Legacy Authenticated Ownership
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null; // No token session and no legacy session
  }

  // Fetch invitation using normal client (applies RLS for user_id)
  const { data: invRaw, error } = await supabase
    .from('invitations')
    .select('id, user_id, status, edit_token_hash, slug, title')
    .eq('id', invitationId)
    .single();

  const inv = invRaw as { id: string; user_id: string; status: string; edit_token_hash: string | null; slug: string; title: string } | null;

  if (error || !inv || inv.user_id !== user.id) {
    return null; // Not authorized
  }

  return inv; // Authorized via Legacy Auth
}
