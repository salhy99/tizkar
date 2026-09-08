-- DEVELOPMENT ONLY: E2E Reference Data Bootstrap
-- Injects required reference data to satisfy subsequent migrations without modifying history.

INSERT INTO event_types (id, name_ar, name_en, slug, is_active, display_order)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'زواج', 'Wedding', 'wedding', true, 1)
ON CONFLICT (id) DO NOTHING;
