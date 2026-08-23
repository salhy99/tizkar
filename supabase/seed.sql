-- Seed event types
INSERT INTO event_types (id, name_ar, name_en, slug, is_active, display_order)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'زواج', 'Wedding', 'wedding', true, 1),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'خطوبة', 'Engagement', 'engagement', true, 2),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'عقد قران', 'Nikah', 'nikah', true, 3),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'تخرج', 'Graduation', 'graduation', true, 4),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'عيد ميلاد', 'Birthday', 'birthday', true, 5),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'مولود جديد', 'Newborn', 'newborn', true, 6),
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'مشية', 'Mashaya', 'mashaya', true, 7),
  ('b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e', 'مناسبات أخرى', 'Other', 'other', true, 8);

-- Seed plans
INSERT INTO plans (id, name, price, currency, duration_days, status, display_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'FREE_PREVIEW', 0, 'IQD', 0, 'ACTIVE', 1),
  ('22222222-2222-2222-2222-222222222222', 'BASIC', 25000, 'IQD', 120, 'ACTIVE', 2),
  ('33333333-3333-3333-3333-333333333333', 'PLUS', 40000, 'IQD', 120, 'ACTIVE', 3),
  ('44444444-4444-4444-4444-444444444444', 'PREMIUM', 60000, 'IQD', 120, 'ACTIVE', 4);

-- Seed template "ليالي"
INSERT INTO templates (id, event_type_id, name, slug, description, base_price, status, is_featured)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', -- wedding
  'ليالي',
  'layali',
  'Luxury Arabic Minimal',
  40000,
  'ACTIVE',
  true
);

-- Seed template version
INSERT INTO template_versions (id, template_id, version_number, configuration, theme, sections, status)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'v1',
  '{"palette": "Warm Ivory, Dark Charcoal, Muted Gold", "typography": "Elegant Arabic"}',
  '{"primary": "#A88952", "background": "#FAF8F3", "text": "#1C1C1C", "font": "Cairo"}',
  '[{"type": "hero", "enabled": true}, {"type": "names", "enabled": true}, {"type": "date", "enabled": true}, {"type": "venue", "enabled": true}]',
  'ACTIVE'
);
