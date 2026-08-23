-- Phase 4: Payments and Orders Migration

-- Add plan_snapshot and rejection_reason to orders
ALTER TABLE orders ADD COLUMN plan_snapshot JSONB;
ALTER TABLE orders ADD COLUMN rejection_reason TEXT;

-- Update RLS triggers/functions to protect critical fields.
-- We already have `protect_publish_status` that prevents a client from changing `status` to 'PUBLISHED'.
-- We need to protect the order status, payment status, expires_at, etc from being modified directly by users.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_order_modifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Service Role or Admin can do anything
  IF auth.uid() IS NULL OR public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;

  -- Block users from changing status to APPROVED or REJECTED
  IF NEW.status IN ('APPROVED', 'REJECTED') AND OLD.status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Users cannot approve or reject orders';
  END IF;

  -- Block users from altering admin approval fields
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR 
     NEW.approved_at IS DISTINCT FROM OLD.approved_at OR 
     NEW.rejected_by IS DISTINCT FROM OLD.rejected_by OR 
     NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
    RAISE EXCEPTION 'Users cannot modify admin approval fields';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_orders
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_order_modifications();

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_payment_modifications()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('APPROVED', 'REJECTED') AND OLD.status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Users cannot approve or reject payments';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_payments
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_payment_modifications();

-- Secure expires_at update
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_invitation_modifications()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;
  
  -- Users cannot change expires_at
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Users cannot modify expiration date';
  END IF;

  -- Users cannot change published_at
  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'Users cannot modify published date';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_invitations_dates
BEFORE UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_invitation_modifications();

