-- DEVELOPMENT ONLY: Phase 7.3-B — Add Modern Glass and Rose Garden templates
-- DO NOT apply to Production.
-- This migration inserts template records and their initial versions for
-- Modern Glass and Rose Garden, scoped to the existing 'wedding' event type.

DO $$
DECLARE
  v_wedding_event_type_id UUID;
  v_modern_glass_id UUID;
  v_rose_garden_id UUID;
BEGIN
  -- Resolve the wedding event_type id by stable slug
  SELECT id INTO v_wedding_event_type_id
  FROM event_types
  WHERE slug = 'wedding'
  LIMIT 1;

  IF v_wedding_event_type_id IS NULL THEN
    RAISE EXCEPTION 'event_type with slug "wedding" not found. Ensure initial schema seed ran first.';
  END IF;

  -- ── Insert Modern Glass template ──────────────────────────────────────────
  INSERT INTO templates (event_type_id, name, slug, description, base_price, status, is_featured, thumbnail_url)
  VALUES (
    v_wedding_event_type_id,
    'مودرن جلاس',
    'modern-glass',
    'تصميم عصري راقٍ يعتمد لمسات الزجاج الشفاف والتكوين المعماري النظيف.',
    15000,
    'ACTIVE',
    false,
    '/templates/modern-glass-thumb.webp'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_modern_glass_id;

  -- Insert initial template version if template was just created
  IF v_modern_glass_id IS NOT NULL THEN
    INSERT INTO template_versions (template_id, version_number, status)
    VALUES (v_modern_glass_id, '1.0.0', 'ACTIVE');
  END IF;

  -- ── Insert Rose Garden template ───────────────────────────────────────────
  INSERT INTO templates (event_type_id, name, slug, description, base_price, status, is_featured, thumbnail_url)
  VALUES (
    v_wedding_event_type_id,
    'حديقة الورد',
    'rose-garden',
    'تصميم رومانسي مستوحى من قرطاسية الأفراح الفاخرة مع لمسات نباتية دافئة.',
    15000,
    'ACTIVE',
    false,
    '/templates/rose-garden-thumb.webp'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_rose_garden_id;

  IF v_rose_garden_id IS NOT NULL THEN
    INSERT INTO template_versions (template_id, version_number, status)
    VALUES (v_rose_garden_id, '1.0.0', 'ACTIVE');
  END IF;

END $$;
