-- Create the admin_audit_log table for operational tracking
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Protect audit log immutability
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs (assuming profiles role = 'ADMIN' | 'SUPER_ADMIN')
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Only service role (trusted server action) can insert
CREATE POLICY "Service role can insert audit logs" ON admin_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- No one can update or delete
-- This preserves immutability on the application layer.

-- Add index on entity_id and action for faster searches in operational history
CREATE INDEX idx_audit_entity_id ON admin_audit_log(entity_id);
CREATE INDEX idx_audit_action ON admin_audit_log(action);
