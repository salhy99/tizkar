-- Migration: Atomic Media Commit RPC
CREATE OR REPLACE FUNCTION commit_media_upload_atomic(
  p_invitation_id UUID,
  p_reservation_id UUID,
  p_storage_path TEXT,
  p_category TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_version RECORD;
  v_gallery JSONB;
BEGIN
  -- 1. lock invitation to serialize all media mutations for this invitation
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  -- 2. verify reservation belongs to invitation, is CONFIRMED, and unexpired
  SELECT * INTO v_res
  FROM invitation_media_reservations
  WHERE id = p_reservation_id 
    AND invitation_id = p_invitation_id
    AND status IN ('RESERVED', 'CONFIRMED')
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not valid, not confirmed, or expired');
  END IF;

  -- 3. read current canonical invitation data (draft version)
  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft invitation version not found');
  END IF;

  -- 4. append media reference atomically
  IF p_category = 'gallery' THEN
    v_gallery := COALESCE(v_version.invitation_data->'gallery', '[]'::jsonb);
    
    -- Verify path not already present in the JSONB array
    IF NOT (v_gallery ? p_storage_path) THEN
      v_gallery := v_gallery || to_jsonb(p_storage_path);
      
      -- update JSONB, keeping other editor autosaved fields perfectly intact
      UPDATE invitation_versions
      SET invitation_data = jsonb_set(COALESCE(invitation_data, '{}'::jsonb), '{gallery}', v_gallery)
      WHERE id = v_version.id;
    END IF;
  ELSIF p_category = 'music' THEN
    -- update music path, keeping other editor autosaved fields intact
    UPDATE invitation_versions
    SET invitation_data = jsonb_set(COALESCE(invitation_data, '{}'::jsonb), '{music}', to_jsonb(p_storage_path))
    WHERE id = v_version.id;
  END IF;

  -- 5. delete exact reservation, ending temporary quota consumption
  -- Since we just added it to the canonical source, there is NO gap where neither count.
  DELETE FROM invitation_media_reservations
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION commit_media_upload_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commit_media_upload_atomic TO service_role;
