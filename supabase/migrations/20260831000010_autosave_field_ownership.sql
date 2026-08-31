-- Migration: Autosave Field Ownership & Atomic Media Deletion

-- 1. Update the atomic data update to strictly strip server-owned fields in SQL layer (defense in depth)
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
  v_sanitized JSONB;
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

  -- 3. Strip server-owned fields from incoming patch
  v_sanitized := p_new_data - 'gallery' - 'coverImage' - 'music' - 'presentation';

  -- 4. merge at the top-level keys
  v_merged := COALESCE(v_version.invitation_data, '{}'::jsonb) || v_sanitized;

  -- 5. update
  UPDATE invitation_versions
  SET invitation_data = v_merged,
      updated_at = now()
  WHERE id = v_version.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Atomic Media Removal
CREATE OR REPLACE FUNCTION remove_media_atomic(
  p_invitation_id UUID,
  p_category TEXT,
  p_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
  v_data JSONB;
  v_current_url TEXT;
BEGIN
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft invitation version not found');
  END IF;

  v_data := COALESCE(v_version.invitation_data, '{}'::jsonb);

  IF p_category = 'gallery' THEN
    -- Remove the string element from the JSONB array
    v_data := jsonb_set(v_data, '{gallery}', COALESCE(v_data->'gallery', '[]'::jsonb) - p_path);
  ELSIF p_category = 'music' THEN
    v_current_url := v_data->'music'->>'url';
    IF v_current_url = p_path THEN
      v_data := v_data - 'music';
    END IF;
  END IF;

  UPDATE invitation_versions
  SET invitation_data = v_data,
      updated_at = now()
  WHERE id = v_version.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION remove_media_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_media_atomic TO service_role;

-- 3. Atomic Gallery Reorder
CREATE OR REPLACE FUNCTION reorder_gallery_atomic(
  p_invitation_id UUID,
  p_new_gallery JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
  v_data JSONB;
BEGIN
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft invitation version not found');
  END IF;

  -- Trust the provided array. In a strict commercial system, we could validate 
  -- that p_new_gallery contains exactly the same elements as v_data->'gallery', 
  -- but since it's server-driven by authorized owner, simple replacement is safe.
  v_data := COALESCE(v_version.invitation_data, '{}'::jsonb);
  v_data := jsonb_set(v_data, '{gallery}', p_new_gallery);

  UPDATE invitation_versions
  SET invitation_data = v_data,
      updated_at = now()
  WHERE id = v_version.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION reorder_gallery_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reorder_gallery_atomic TO service_role;

-- 4. Atomic Set Cover
CREATE OR REPLACE FUNCTION set_cover_atomic(
  p_invitation_id UUID,
  p_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
  v_data JSONB;
BEGIN
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft invitation version not found');
  END IF;

  v_data := COALESCE(v_version.invitation_data, '{}'::jsonb);
  
  IF p_path IS NULL THEN
    v_data := v_data - 'coverImage';
  ELSE
    v_data := jsonb_set(v_data, '{coverImage}', to_jsonb(p_path));
  END IF;

  UPDATE invitation_versions
  SET invitation_data = v_data,
      updated_at = now()
  WHERE id = v_version.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION set_cover_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_cover_atomic TO service_role;

-- 5. Fix commit_media_upload_atomic for music shape
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
  -- 1. lock the invitation row
  PERFORM 1 FROM invitations WHERE id = p_invitation_id FOR UPDATE;

  -- 2. Verify reservation
  SELECT * INTO v_res
  FROM invitation_media_reservations
  WHERE id = p_reservation_id 
    AND invitation_id = p_invitation_id
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation invalid or expired');
  END IF;

  -- Verify path matches
  IF v_res.path IS NOT NULL AND v_res.path != p_storage_path THEN
    RETURN jsonb_build_object('success', false, 'error', 'Path mismatch');
  END IF;

  -- 3. get current canonical data
  SELECT * INTO v_version
  FROM invitation_versions
  WHERE invitation_id = p_invitation_id AND is_published = false
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft version not found');
  END IF;

  -- 4. Mutation
  IF p_category = 'gallery' THEN
    v_gallery := COALESCE(v_version.invitation_data->'gallery', '[]'::jsonb);
    
    -- Idempotent append
    IF NOT (v_gallery ? p_storage_path) THEN
      v_gallery := v_gallery || to_jsonb(p_storage_path);
      
      UPDATE invitation_versions
      SET invitation_data = jsonb_set(COALESCE(invitation_data, '{}'::jsonb), '{gallery}', v_gallery),
          updated_at = now()
      WHERE id = v_version.id;
    END IF;
  ELSIF p_category = 'music' THEN
    -- Correctly insert an object for music: { url: path, type: 'MP3' }
    UPDATE invitation_versions
    SET invitation_data = jsonb_set(COALESCE(invitation_data, '{}'::jsonb), '{music}', jsonb_build_object('url', p_storage_path, 'type', 'MP3')),
        updated_at = now()
    WHERE id = v_version.id;
  END IF;

  -- 5. Atomic release of reservation
  DELETE FROM invitation_media_reservations WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
