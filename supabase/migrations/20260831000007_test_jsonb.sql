CREATE OR REPLACE FUNCTION test_jsonb_merge(p_existing jsonb, p_incoming jsonb) RETURNS jsonb AS $$
BEGIN
  RETURN p_existing - 'A';
END;
$$ LANGUAGE plpgsql;
