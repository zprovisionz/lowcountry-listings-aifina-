-- Free tier: 3 generations/month for new signups; MLS comps UI uses waitlist (see ReportsPage).
-- Aligns apply_tier_limits + Stripe cancel path with product defaults.

-- ─── Early access waitlist (Reports / market intelligence interest) ───
CREATE TABLE IF NOT EXISTS early_access_waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'reports',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS early_access_waitlist_email_lower_idx
  ON early_access_waitlist (lower(email));

ALTER TABLE early_access_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "early_access_waitlist_insert_anon" ON early_access_waitlist;
CREATE POLICY "early_access_waitlist_insert_anon"
  ON early_access_waitlist FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "early_access_waitlist_insert_authenticated" ON early_access_waitlist;
CREATE POLICY "early_access_waitlist_insert_authenticated"
  ON early_access_waitlist FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── Free tier default: 3 generations (was 10) ─────────────────────────
ALTER TABLE profiles
  ALTER COLUMN generations_limit SET DEFAULT 3;

UPDATE profiles
SET generations_limit = 3
WHERE tier = 'free' AND generations_limit = 10;

-- apply_tier_limits: free tier cap
CREATE OR REPLACE FUNCTION apply_tier_limits(p_user_id UUID, p_tier TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET
    tier                  = p_tier,
    generations_limit     = CASE p_tier
      WHEN 'free'     THEN 3
      WHEN 'starter'  THEN 100
      WHEN 'pro'      THEN -1
      WHEN 'pro_plus' THEN -1
      WHEN 'team'     THEN -1
      ELSE 3
    END,
    staging_credits_limit = CASE p_tier
      WHEN 'free'     THEN 0
      WHEN 'starter'  THEN 10
      WHEN 'pro'      THEN 40
      WHEN 'pro_plus' THEN 100
      WHEN 'team'     THEN 200
      ELSE 0
    END
  WHERE id = p_user_id;
END;
$$;

-- New auth users pick up generations_limit = 3 from column DEFAULT.
-- Existing free users at 10 are corrected above.
