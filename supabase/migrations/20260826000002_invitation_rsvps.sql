-- Migration: Create invitation_rsvps table

CREATE TABLE IF NOT EXISTS public.invitation_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('ATTENDING', 'DECLINED')),
    guest_count INTEGER NOT NULL DEFAULT 1,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by invitation_id
CREATE INDEX IF NOT EXISTS idx_invitation_rsvps_invitation_id ON public.invitation_rsvps(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_rsvps_created_at ON public.invitation_rsvps(created_at DESC);

-- Enable RLS
ALTER TABLE public.invitation_rsvps ENABLE ROW LEVEL SECURITY;

-- Deny all public access. 
-- Writes will happen via Service Role in a Server Action after validation and rate-limiting.
-- Reads will happen via Service Role in a Server Action after verifying Edit Token.
CREATE POLICY "Deny all public access on invitation_rsvps"
    ON public.invitation_rsvps
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger for updated_at
CREATE TRIGGER handle_updated_at_invitation_rsvps
    BEFORE UPDATE ON public.invitation_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
