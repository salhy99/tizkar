-- Phase 10.1-B: Product Funnel Events
CREATE TABLE public.product_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_name text NOT NULL,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  template_slug text,
  package_code text,
  device_class text,
  source_page text,
  event_key text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_event_name CHECK (
    event_name IN (
      'FUNNEL_LANDING_VIEW',
      'FUNNEL_TEMPLATE_CATALOG_VIEW',
      'FUNNEL_TEMPLATE_SELECTED',
      'FUNNEL_DRAFT_CREATED',
      'FUNNEL_EDITOR_OPENED',
      'FUNNEL_EDITOR_EDITED',
      'FUNNEL_PACKAGE_VIEWED',
      'FUNNEL_PACKAGE_SELECTED',
      'FUNNEL_PAYMENT_ORDER_CREATED',
      'FUNNEL_WHATSAPP_CLICKED',
      'FUNNEL_PAYMENT_CONFIRMED',
      'FUNNEL_PUBLISH_ATTEMPTED',
      'FUNNEL_PUBLISHED'
    )
  ),
  
  CONSTRAINT chk_device_class CHECK (
    device_class IN ('mobile', 'tablet', 'desktop', 'unknown')
  )
);

-- Indexes for performance
CREATE INDEX idx_product_funnel_session ON public.product_funnel_events(session_id);
CREATE INDEX idx_product_funnel_event_name_created_at ON public.product_funnel_events(event_name, created_at DESC);
CREATE INDEX idx_product_funnel_invitation_id ON public.product_funnel_events(invitation_id);
CREATE UNIQUE INDEX idx_product_funnel_event_key ON public.product_funnel_events(event_key) WHERE event_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.product_funnel_events ENABLE ROW LEVEL SECURITY;

-- Explicitly deny all anonymous operations
-- Only Service Role can insert/read
CREATE POLICY "Deny all anonymous operations" ON public.product_funnel_events
  FOR ALL
  TO public
  USING (false);
