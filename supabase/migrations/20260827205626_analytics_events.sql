-- Phase 8.2: Invitation Analytics Table
CREATE TABLE public.invitation_analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  visitor_hash text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying analytics per invitation efficiently
CREATE INDEX idx_analytics_invitation_id_created_at 
ON public.invitation_analytics_events (invitation_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.invitation_analytics_events ENABLE ROW LEVEL SECURITY;

-- Strict RLS: Deny all by default, only Service Role can access directly.
-- Public ingestion via Server Action with Service Role.
-- Owner analytics via Server Action with Service Role after auth.
