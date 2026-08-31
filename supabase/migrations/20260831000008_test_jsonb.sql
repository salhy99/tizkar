CREATE OR REPLACE FUNCTION test_jsonb_merge(p_existing jsonb, p_incoming jsonb) RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_set(p_existing, '{gallery}', (p_existing->'gallery') - 'A');
END;
$$ LANGUAGE plpgsql;
