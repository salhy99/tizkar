-- Add RPC for updating invitation_data safely
CREATE OR REPLACE FUNCTION update_invitation_data_atomic(
  p_invitation_id UUID,
  p_new_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
  v_merged JSONB;
BEGIN
  -- 1. lock invitation
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  -- 2. read current canonical invitation data (draft version)
  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft invitation version not found');
  END IF;

  -- 3. merge at the top-level keys
  -- The || operator on jsonb merges the keys. 
  -- Existing keys in v_version.invitation_data are overwritten by p_new_data.
  -- New keys are added.
  v_merged := COALESCE(v_version.invitation_data, '{}'::jsonb) || p_new_data;

  -- 4. update
  UPDATE invitation_versions
  SET invitation_data = v_merged,
      updated_at = now()
  WHERE id = v_version.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION update_invitation_data_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_invitation_data_atomic TO service_role;
