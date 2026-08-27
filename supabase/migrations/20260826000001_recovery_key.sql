-- Phase 6.4-E2: Recovery Key

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS recovery_key_hash TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS last_recovered_at TIMESTAMPTZ;

-- Add a unique index on recovery_key_hash (allowing multiple NULLs is fine in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_recovery_key_hash ON invitations (recovery_key_hash);
