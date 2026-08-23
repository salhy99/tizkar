-- Phase 3: Public Invitation & RSVP Schema

-- RSVP Responses
CREATE TABLE rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES invitations ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  companions INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'MAYBE', 'DECLINED')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for RSVP
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- Guests can insert their own RSVP blindly (no auth required for public RSVP, but controlled via server action).
-- The actual insertion will be handled by a secure server action that bypasses RLS for the insert.
-- We will allow public inserts if needed, but it's safer to use Service Role for anonymous inserts.
-- Owners can read their own invitation's RSVPs.
CREATE POLICY "Owners can read their RSVPs" ON rsvp_responses 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM invitations WHERE id = rsvp_responses.invitation_id AND user_id = auth.uid())
);

-- Admins can read all RSVPs
CREATE POLICY "Admins can read all RSVPs" ON rsvp_responses 
FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Analytics / Views Tracker
CREATE TABLE invitation_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES invitations ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invitation_views ENABLE ROW LEVEL SECURITY;
-- Owners can read their views
CREATE POLICY "Owners can read their views" ON invitation_views 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM invitations WHERE id = invitation_views.invitation_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can read all views" ON invitation_views 
FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- Storage Buckets setup (pseudo code as it requires superuser in some cases, but standard for supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invitations', 'invitations', true) ON CONFLICT DO NOTHING;

-- Storage RLS:
-- Users can upload to their own invitation folder: invitations/{id}/*
-- Everyone can read from invitations bucket
