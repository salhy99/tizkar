-- Phase 6.2: Real OTP with OTPIQ

CREATE TABLE otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'FAILED')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by phone
CREATE INDEX idx_otp_requests_phone ON otp_requests(phone);

-- RLS: Strictly server-side (Service Role)
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- No public policies! Only Service Role can access this table.

-- Helper function to lock OTP requests safely
CREATE OR REPLACE FUNCTION increment_otp_attempt(request_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_attempts INTEGER;
BEGIN
  UPDATE otp_requests 
  SET attempts = attempts + 1, updated_at = NOW() 
  WHERE id = request_id 
  RETURNING attempts INTO current_attempts;
  
  IF current_attempts >= 5 THEN
    UPDATE otp_requests SET status = 'LOCKED', updated_at = NOW() WHERE id = request_id;
  END IF;

  RETURN current_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
