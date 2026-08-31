-- Migration: Atomic Media & RSVP Quota Enforcement

-- 1. RSVP Quota Enforcement
CREATE OR REPLACE FUNCTION submit_invitation_rsvp_atomic(
  p_invitation_id UUID,
  p_guest_name TEXT,
  p_attendance_status TEXT,
  p_guest_count INT,
  p_message TEXT,
  p_max_rsvps INT -- passed from trusted server, -1 for unlimited
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INT;
  v_invitation RECORD;
BEGIN
  -- Lock the invitation to serialize concurrent RSVP submissions for this specific invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF v_invitation.status != 'PUBLISHED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الدعوة غير متاحة لتسجيل الحضور');
  END IF;
  
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية هذه الدعوة');
  END IF;

  IF p_max_rsvps != -1 THEN
    SELECT COUNT(*) INTO v_current_count
    FROM invitation_rsvps
    WHERE invitation_id = p_invitation_id;

    IF v_current_count >= p_max_rsvps THEN
      RETURN jsonb_build_object('success', false, 'error', 'RSVP_QUOTA_EXCEEDED');
    END IF;
  END IF;

  INSERT INTO invitation_rsvps (invitation_id, guest_name, attendance_status, guest_count, message)
  VALUES (p_invitation_id, p_guest_name, p_attendance_status, p_guest_count, p_message);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION submit_invitation_rsvp_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_invitation_rsvp_atomic TO service_role;


-- 2. Media Quota Enforcement
CREATE TABLE IF NOT EXISTS invitation_media_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED', -- RESERVED, CONFIRMED
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_reservations_active 
ON invitation_media_reservations(invitation_id, category, status, expires_at);

REVOKE ALL ON invitation_media_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON invitation_media_reservations TO service_role;

CREATE OR REPLACE FUNCTION reserve_media_upload_slot(
  p_invitation_id UUID,
  p_category TEXT,
  p_max_images INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_active_reservations INT;
  v_json_count INT;
  v_total_usage INT;
  v_reservation_id UUID;
BEGIN
  -- Lock the invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Calculate active reservations (RESERVED and CONFIRMED that are not yet expired)
  SELECT COUNT(*) INTO v_active_reservations
  FROM invitation_media_reservations
  WHERE invitation_id = p_invitation_id 
    AND category = p_category
    AND expires_at > now();

  -- Get current JSON gallery count
  IF p_category = 'gallery' THEN
    SELECT jsonb_array_length(COALESCE(invitation_data->'gallery', '[]'::jsonb)) INTO v_json_count
    FROM invitation_versions
    WHERE invitation_id = p_invitation_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_json_count IS NULL THEN
      v_json_count := 0;
    END IF;

    v_total_usage := v_json_count + v_active_reservations;

    IF v_total_usage >= p_max_images THEN
      RETURN jsonb_build_object('success', false, 'error', 'MEDIA_QUOTA_EXCEEDED');
    END IF;
  END IF;
  
  -- For music, max is usually 1, but we handle it similarly if needed
  IF p_category = 'music' THEN
    SELECT CASE WHEN (invitation_data->>'music') IS NOT NULL THEN 1 ELSE 0 END INTO v_json_count
    FROM invitation_versions
    WHERE invitation_id = p_invitation_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_json_count IS NULL THEN v_json_count := 0; END IF;
    v_total_usage := v_json_count + v_active_reservations;
    
    IF v_total_usage >= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'MEDIA_QUOTA_EXCEEDED');
    END IF;
  END IF;

  v_reservation_id := gen_random_uuid();

  -- Reserve for 15 minutes to allow upload
  INSERT INTO invitation_media_reservations (id, invitation_id, category, status, expires_at)
  VALUES (v_reservation_id, p_invitation_id, p_category, 'RESERVED', now() + interval '15 minutes');

  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id);
END;
$$;

REVOKE ALL ON FUNCTION reserve_media_upload_slot FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_media_upload_slot TO service_role;

-- 3. Confirm Media Slot
CREATE OR REPLACE FUNCTION confirm_media_upload_slot(
  p_reservation_id UUID,
  p_invitation_id UUID,
  p_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM invitation_media_reservations
  WHERE id = p_reservation_id AND invitation_id = p_invitation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_res.status = 'CONFIRMED' THEN
    -- Idempotent success
    RETURN jsonb_build_object('success', true);
  END IF;

  UPDATE invitation_media_reservations
  SET status = 'CONFIRMED',
      path = p_path,
      -- Extend expiration to 1 hour to give them time to save the invitation
      expires_at = now() + interval '1 hour'
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION confirm_media_upload_slot FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_media_upload_slot TO service_role;

-- 4. Release confirmed slots on save
CREATE OR REPLACE FUNCTION release_confirmed_media_slots(
  p_invitation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When the user successfully saves the invitation JSON, we can safely delete
  -- all CONFIRMED reservations, because their paths are now officially in the JSON array,
  -- and will be counted correctly in future quota checks.
  DELETE FROM invitation_media_reservations
  WHERE invitation_id = p_invitation_id AND status = 'CONFIRMED';
END;
$$;

REVOKE ALL ON FUNCTION release_confirmed_media_slots FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_confirmed_media_slots TO service_role;

-- 5. Cancel media slot (on delete)
CREATE OR REPLACE FUNCTION cancel_media_upload_slot(
  p_invitation_id UUID,
  p_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM invitation_media_reservations
  WHERE invitation_id = p_invitation_id AND path = p_path;
END;
$$;

REVOKE ALL ON FUNCTION cancel_media_upload_slot FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_media_upload_slot TO service_role;
