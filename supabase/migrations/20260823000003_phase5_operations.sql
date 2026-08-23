-- Phase 5: Dashboard, Operations, and Notifications

-- 1. Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'PAYMENT_RECEIVED', 'ORDER_APPROVED', 'ORDER_REJECTED', 'INVITATION_PUBLISHED', 'INVITATION_EXPIRED'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications 
FOR UPDATE USING (auth.uid() = user_id);

-- System uses Service Role to insert notifications, so no insert policy needed for users.

-- 2. Index for RSVP filtering and Analytics performance
CREATE INDEX IF NOT EXISTS idx_rsvp_invitation_id ON rsvp_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_views_invitation_id_date ON invitation_views(invitation_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 3. Enhance Admin Logs
-- We already have admin_logs, just making sure we have an index on entity_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_id ON admin_logs(entity_id);

-- 4. Expiration triggers or functions
-- We will handle expiration logically in the code (where expires_at < now()), 
-- but a cron job or scheduled function could physically update the status to EXPIRED.
-- For now, we will rely on a server-side check.

