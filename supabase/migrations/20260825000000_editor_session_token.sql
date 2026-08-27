-- Add edit_token_hash to invitations for Phase 6.4-A Authentication Decoupling
ALTER TABLE public.invitations ADD COLUMN edit_token_hash TEXT;

-- We don't remove user_id or alter RLS yet in Phase 6.4-A.
