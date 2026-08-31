-- Phase 10.1-C: Add TEMPLATE_DETAIL_VIEW and synthetic flag
ALTER TABLE public.product_funnel_events 
  DROP CONSTRAINT chk_event_name;

ALTER TABLE public.product_funnel_events 
  ADD CONSTRAINT chk_event_name CHECK (
    event_name IN (
      'FUNNEL_LANDING_VIEW',
      'FUNNEL_TEMPLATE_CATALOG_VIEW',
      'FUNNEL_TEMPLATE_DETAIL_VIEW',
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
  );

ALTER TABLE public.product_funnel_events 
  ADD COLUMN is_synthetic boolean NOT NULL DEFAULT false;

-- Create index for filtering out synthetic data
CREATE INDEX idx_product_funnel_is_synthetic ON public.product_funnel_events(is_synthetic);
