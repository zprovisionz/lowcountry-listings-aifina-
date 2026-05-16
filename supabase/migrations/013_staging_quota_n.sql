-- Atomic "do I have room for N staging jobs?" for batch UI + client-side orchestration.
-- Per-job consumption still uses increment_staging_count after each successful stage.

CREATE OR REPLACE FUNCTION public.check_staging_quota_n(p_user_id UUID, p_n INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used   INT;
  v_limit  INT;
  v_extra  INT;
BEGIN
  IF p_user_id IS NULL OR p_n IS NULL OR p_n < 1 THEN
    RETURN FALSE;
  END IF;

  SELECT staging_credits_used, staging_credits_limit, extra_staging_credits
    INTO v_used, v_limit, v_extra
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN (v_used + p_n) <= (v_limit + COALESCE(v_extra, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.check_staging_quota_n(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_staging_quota_n(UUID, INT) TO service_role;

-- Caller-safe: authenticated users can only check their own balance.
CREATE OR REPLACE FUNCTION public.check_staging_quota_n_for_me(p_n INT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE public.check_staging_quota_n(auth.uid(), p_n)
  END;
$$;

REVOKE ALL ON FUNCTION public.check_staging_quota_n_for_me(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_staging_quota_n_for_me(INT) TO authenticated;
