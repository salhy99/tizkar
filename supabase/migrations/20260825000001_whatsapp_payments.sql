-- Phase 6.4-E1: WhatsApp Payments

-- 1. Add tracking_code
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

-- 2. Add payment_method directly to orders for simpler MVP flow
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'WHATSAPP_MANUAL';

-- 3. Add paid_at timestamp
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 4. Update the prevent_unauthorized_order_modifications trigger to protect paid_at
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_order_modifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Service Role or Admin can do anything
  IF auth.uid() IS NULL OR public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;

  -- Block users from changing status to APPROVED, REJECTED, PAID
  IF NEW.status IN ('APPROVED', 'REJECTED', 'PAID') AND OLD.status NOT IN ('APPROVED', 'REJECTED', 'PAID') THEN
    RAISE EXCEPTION 'Users cannot approve or reject orders';
  END IF;

  -- Block users from altering admin approval fields
  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR 
     NEW.approved_at IS DISTINCT FROM OLD.approved_at OR 
     NEW.rejected_by IS DISTINCT FROM OLD.rejected_by OR 
     NEW.rejected_at IS DISTINCT FROM OLD.rejected_at OR
     NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Users cannot modify admin approval fields';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
