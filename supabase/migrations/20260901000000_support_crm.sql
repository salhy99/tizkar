CREATE TABLE IF NOT EXISTS public.support_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('PAYMENT', 'RECOVERY', 'EDITOR', 'MEDIA', 'PUBLISH', 'RSVP', 'ACCOUNT', 'TECHNICAL', 'OTHER')),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED')),
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    subject TEXT NOT NULL CHECK (length(trim(subject)) > 0 AND length(subject) <= 200),
    summary TEXT,
    assigned_admin_id UUID,
    assigned_admin_identifier TEXT,
    created_by_admin_id UUID,
    created_by_admin_identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    author_admin_id UUID,
    author_admin_identifier TEXT NOT NULL,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 10000),
    note_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (note_type = 'INTERNAL'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_notes ENABLE ROW LEVEL SECURITY;

-- Trusted Server Only (Explicit Deny for all roles)
-- By default, without policies, RLS denies all access to anon and authenticated.
-- The service_role bypasses RLS naturally.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_cases_status ON public.support_cases(status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_cases_invitation_id ON public.support_cases(invitation_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_order_id ON public.support_cases(order_id);
CREATE INDEX IF NOT EXISTS idx_support_case_notes_case_id ON public.support_case_notes(case_id);
