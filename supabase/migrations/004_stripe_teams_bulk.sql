-- ═══════════════════════════════════════════════════════════════════
-- LOWCOUNTRY LISTINGS AI — STRIPE, TEAMS, BULK, MLS
-- Migration 004
-- ═══════════════════════════════════════════════════════════════════

-- ─── Profiles: add Stripe + pay-per-use columns ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS extra_gen_credits    INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_staging_credits INT NOT NULL DEFAULT 0;

-- ─── team_invites ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  token       TEXT NOT NULL UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token   ON team_invites(token);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invites_team_owner_editor" ON team_invites
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','editor')
    )
  );

-- ─── mls_connections (RESO stub) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mls_connections (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mls_name              TEXT NOT NULL,
  api_endpoint          TEXT,
  access_token_encrypted TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','error')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mls_connections_user_id ON mls_connections(user_id);

ALTER TABLE mls_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mls_connections_own" ON mls_connections
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS mls_connections_updated_at ON mls_connections;
CREATE TRIGGER mls_connections_updated_at
  BEFORE UPDATE ON mls_connections
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── bulk_jobs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','complete','error')),
  total_rows     INT  NOT NULL DEFAULT 0,
  processed_rows INT  NOT NULL DEFAULT 0,
  failed_rows    INT  NOT NULL DEFAULT 0,
  results        JSONB DEFAULT '[]',
  error_message  TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_user_id ON bulk_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status  ON bulk_jobs(status);

ALTER TABLE bulk_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bulk_jobs_own" ON bulk_jobs
  FOR ALL USING (auth.uid() = user_id);

-- ─── credit_purchases ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_purchases (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  credit_type           TEXT NOT NULL CHECK (credit_type IN ('generation','staging')),
  credits_purchased     INT  NOT NULL,
  amount_cents          INT  NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_purchases_own" ON credit_purchases
  FOR ALL USING (auth.uid() = user_id);

-- ─── RPC: accept_team_invite ──────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_team_invite(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM team_invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired invite');
  END IF;

  UPDATE profiles
  SET team_id = v_invite.team_id, role = v_invite.role
  WHERE id = auth.uid();

  UPDATE team_invites SET accepted_at = NOW() WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;

-- ─── RPC: check_generation_quota ───────────────────────────────────
-- Returns allowed, used, limit, extra_credits (for display)
CREATE OR REPLACE FUNCTION check_generation_quota(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used   INT;
  v_limit  INT;
  v_extra  INT;
  v_effective_limit BIGINT;
BEGIN
  SELECT generations_used, generations_limit, extra_gen_credits
    INTO v_used, v_limit, v_extra
    FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'extra_credits', 0);
  END IF;

  -- -1 = unlimited base limit
  v_effective_limit := CASE WHEN v_limit = -1 THEN 2147483647 ELSE v_limit END;
  v_effective_limit := v_effective_limit + v_extra;

  RETURN jsonb_build_object(
    'allowed', (v_used < v_effective_limit),
    'used', v_used,
    'limit', v_limit,
    'extra_credits', v_extra
  );
END;
$$;
