-- Phase 8.2-C: Add check constraint to analytics event type
ALTER TABLE public.invitation_analytics_events
ADD CONSTRAINT chk_event_type CHECK (event_type IN ('INVITATION_VIEW', 'SHARE_CLICK', 'MAP_CLICK'));
