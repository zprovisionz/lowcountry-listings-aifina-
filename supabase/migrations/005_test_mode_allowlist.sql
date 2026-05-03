-- ═══════════════════════════════════════════════════════════════════
-- LOWCOUNTRY LISTINGS AI — TEST MODE ALLOWLIST
-- Migration 005
-- ═══════════════════════════════════════════════════════════════════

-- Add an allowlist-style flag for debugging/unrestricted testing.
-- This is intentionally opt-in and defaults to false.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN NOT NULL DEFAULT false;

-- RPC: is_test_user
-- Server-side truth for whether a given user can bypass quotas in test mode.
CREATE OR REPLACE FUNCTION is_test_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_test BOOLEAN;
BEGIN
  SELECT is_test_user INTO v_is_test
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_is_test, false);
END;
$$;

REVOKE ALL ON FUNCTION is_test_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_test_user(UUID) TO authenticated;

