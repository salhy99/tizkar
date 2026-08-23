-- Phase 5.1: Security Hotfixes

-- 1. Protect protected fields in invitations
CREATE OR REPLACE FUNCTION public.protect_invitation_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Service Role (backend/admin) bypassing
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admin bypassing
  IF public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;

  -- Block changing protected fields
  IF NEW.user_id != OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id';
  END IF;

  IF NEW.slug != OLD.slug THEN
    RAISE EXCEPTION 'Cannot change slug';
  END IF;

  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'Cannot change published_at';
  END IF;

  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Cannot change expires_at';
  END IF;

  -- Status transitions allowed by the client:
  -- DRAFT -> PENDING_PAYMENT
  -- PENDING_PAYMENT -> PENDING_APPROVAL
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'DRAFT' AND NEW.status = 'PENDING_PAYMENT') OR
      (OLD.status = 'PENDING_PAYMENT' AND NEW.status = 'PENDING_APPROVAL')
    ) THEN
      RAISE EXCEPTION 'Invalid status transition from client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger that only checked PUBLISHED status
DROP TRIGGER IF EXISTS protect_publish_status ON invitations;
DROP FUNCTION IF EXISTS public.prevent_publish_status_change();

-- Add the new comprehensive trigger
CREATE TRIGGER tr_protect_invitation_fields
BEFORE UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION protect_invitation_fields();

-- 2. Prevent large JSONB payloads
ALTER TABLE invitation_versions 
ADD CONSTRAINT check_invitation_data_size 
CHECK (octet_length(invitation_data::text) < 100000);

-- 3. Prevent multiple pending payments for the same order
CREATE UNIQUE INDEX unique_pending_payment ON payments (order_id) WHERE status = 'PENDING';
