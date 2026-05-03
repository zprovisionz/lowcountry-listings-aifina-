-- Migration 010: Webhook idempotency, per-user rate limiting, referral credit grant

-- ─── Idempotency table for Stripe webhook events ──────────────────────────────
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_events_service_only" ON processed_webhook_events;
CREATE POLICY "webhook_events_service_only" ON processed_webhook_events USING (false);

-- ─── subscription_status already added in 004; safe no-op ────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active';

-- ─── Per-user daily API usage: add user_id to existing table ─────────────────
-- Table was created in 009 without user_id; add it here.
ALTER TABLE api_usage_daily ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the global (day, fn_name) unique constraint from migration 009 so the
-- per-user partial index below can be the authoritative uniqueness guarantee.
ALTER TABLE api_usage_daily DROP CONSTRAINT IF EXISTS api_usage_daily_day_fn_name_key;

-- Per-user unique index (partial: only rows with user_id set)
DROP INDEX IF EXISTS api_usage_daily_user_day_fn;
CREATE UNIQUE INDEX api_usage_daily_user_day_fn
  ON api_usage_daily(user_id, day, fn_name)
  WHERE user_id IS NOT NULL;

-- ─── RPC: increment and return per-user daily call count ─────────────────────
CREATE OR REPLACE FUNCTION increment_api_usage(p_user_id UUID, p_fn_name TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO api_usage_daily(user_id, day, fn_name, call_count)
    VALUES (p_user_id, CURRENT_DATE, p_fn_name, 1)
    ON CONFLICT (user_id, day, fn_name) WHERE user_id IS NOT NULL
    DO UPDATE SET call_count = api_usage_daily.call_count + 1
    RETURNING call_count INTO v_count;
  RETURN v_count;
END;
$$;

-- ─── Override check_staging_quota to include extra_staging_credits ───────────
-- Migration 003 only checked v_used < v_limit; extra_staging_credits (added in 004)
-- was never counted, so purchased staging credit packs were silently blocked.
CREATE OR REPLACE FUNCTION check_staging_quota(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used   INT;
  v_limit  INT;
  v_extra  INT;
BEGIN
  SELECT staging_credits_used, staging_credits_limit, extra_staging_credits
    INTO v_used, v_limit, v_extra
    FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_limit = -1 THEN RETURN TRUE; END IF;
  RETURN v_used < (v_limit + COALESCE(v_extra, 0));
END;
$$;

-- ─── Override apply_referral_code to grant credits on first use ───────────────
CREATE OR REPLACE FUNCTION apply_referral_code(p_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id      UUID;
  v_referred_user_id UUID := auth.uid();
  v_rows_inserted    INT;
BEGIN
  IF v_referred_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = p_code;
  IF v_referrer_id IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF v_referrer_id = v_referred_user_id THEN RAISE EXCEPTION 'Cannot use own referral code'; END IF;

  INSERT INTO referrals(referrer_id, referred_user_id, code, status)
    VALUES (v_referrer_id, v_referred_user_id, p_code, 'credited')
    ON CONFLICT (referred_user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
  IF v_rows_inserted > 0 THEN
    -- Grant 5 extra generation credits to the referrer immediately
    UPDATE profiles
      SET extra_gen_credits = COALESCE(extra_gen_credits, 0) + 5
      WHERE id = v_referrer_id;
  END IF;
END;
$$;
