-- DEVELOPMENT ONLY: Phase 8.5-B — Add Noor and Atheer Premium templates
-- DO NOT apply to Production without explicit approval.

DO $$
DECLARE
  v_wedding_event_type_id UUID;
  v_noor_id UUID;
  v_atheer_id UUID;
BEGIN
  -- Resolve the wedding event_type id
  SELECT id INTO v_wedding_event_type_id
  FROM event_types
  WHERE slug = 'wedding'
  LIMIT 1;

  IF v_wedding_event_type_id IS NULL THEN
    RAISE EXCEPTION 'event_type with slug "wedding" not found.';
  END IF;

  -- ── Insert NOOR template ──────────────────────────────────────────
  INSERT INTO templates (event_type_id, name, slug, description, base_price, status, is_featured, thumbnail_url)
  VALUES (
    v_wedding_event_type_id,
    'نور',
    'noor',
    'قالب فاخر يعتمد على التباين العميق والذهبي الكلاسيكي، مصمم لدعوات الزفاف الراقية.',
    25000,
    'ACTIVE',
    true,
    '/templates/noor-thumb.webp'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_noor_id;

  IF v_noor_id IS NOT NULL THEN
    INSERT INTO template_versions (template_id, version_number, status)
    VALUES (v_noor_id, '1.0.0', 'ACTIVE');
  END IF;

  -- ── Insert ATHEER template ───────────────────────────────────────────
  INSERT INTO templates (event_type_id, name, slug, description, base_price, status, is_featured, thumbnail_url)
  VALUES (
    v_wedding_event_type_id,
    'أثير',
    'atheer',
    'تصميم هندسي متقدم بلمسات لونية دافئة وتأثيرات زجاجية، يعكس أناقة عصرية فريدة.',
    25000,
    'ACTIVE',
    true,
    '/templates/atheer-thumb.webp'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_atheer_id;

  IF v_atheer_id IS NOT NULL THEN
    INSERT INTO template_versions (template_id, version_number, status)
    VALUES (v_atheer_id, '1.0.0', 'ACTIVE');
  END IF;

END $$;
