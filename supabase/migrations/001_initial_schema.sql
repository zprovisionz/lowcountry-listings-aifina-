-- ═══════════════════════════════════════════════════════════════════
-- LOWCOUNT RY LISTINGS AI — INITIAL SCHEMA
-- Run in Supabase SQL Editor or via supabase db push
-- ═══════════════════════════════════════════════════════════════════

-- ─── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Teams ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  owner_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url                TEXT,
  primary_color           TEXT DEFAULT '#00ffff',
  accent_color            TEXT DEFAULT '#ff00ff',
  shared_generations_used INT  NOT NULL DEFAULT 0,
  shared_generations_limit INT NOT NULL DEFAULT -1, -- -1 = unlimited
  shared_staging_used     INT  NOT NULL DEFAULT 0,
  shared_staging_limit    INT  NOT NULL DEFAULT 200,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    TEXT NOT NULL,
  full_name                TEXT,
  avatar_url               TEXT,
  tier                     TEXT NOT NULL DEFAULT 'free'
                             CHECK (tier IN ('free','starter','pro','pro_plus','team')),
  generations_used         INT  NOT NULL DEFAULT 0,
  generations_limit        INT  NOT NULL DEFAULT 10, -- -1 = unlimited
  staging_credits_used     INT  NOT NULL DEFAULT 0,
  staging_credits_limit    INT  NOT NULL DEFAULT 0,  -- -1 = unlimited
  team_id                  UUID REFERENCES teams(id) ON DELETE SET NULL,
  role                     TEXT CHECK (role IN ('owner','editor','viewer')),
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Generations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generations (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address                  TEXT NOT NULL,
  neighborhood             TEXT,
  property_type            TEXT NOT NULL DEFAULT 'single_family',
  bedrooms                 INT,
  bathrooms                NUMERIC(3,1),
  sqft                     INT,
  year_built               INT,
  list_price               NUMERIC(12,2),
  mls_number               TEXT,
  amenities                TEXT[] NOT NULL DEFAULT '{}',
  photo_urls               TEXT[] NOT NULL DEFAULT '{}',
  mls_copy                 TEXT,
  airbnb_copy              TEXT,
  social_captions          TEXT[],
  authenticity_score       INT CHECK (authenticity_score BETWEEN 0 AND 100),
  confidence_score         INT CHECK (confidence_score BETWEEN 0 AND 100),
  improvement_suggestions  TEXT[],
  landmark_distances       JSONB,
  tone                     TEXT DEFAULT 'standard',
  staging_style            TEXT,
  staged_photo_urls        TEXT[],
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','generating','complete','error')),
  error_message            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Analytics events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id  UUID REFERENCES generations(id) ON DELETE SET NULL,
  event_type     TEXT NOT NULL CHECK (event_type IN ('view','copy','download','share','generate')),
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_generations_user_id    ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_status     ON generations(status);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id      ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_gen_id       ON analytics_events(generation_id);

-- ─── Row Level Security ─────────────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events  ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own row only
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- teams: owner full access; members can read
CREATE POLICY "teams_owner_all"   ON teams FOR ALL    USING (auth.uid() = owner_id);
CREATE POLICY "teams_member_read" ON teams FOR SELECT
  USING (id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

-- generations: users own their rows; team members can read team rows
CREATE POLICY "gen_owner_all" ON generations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gen_team_read" ON generations FOR SELECT
  USING (
    user_id IN (
      SELECT p2.id FROM profiles p2
      WHERE p2.team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
      AND (SELECT team_id FROM profiles WHERE id = auth.uid()) IS NOT NULL
    )
  );

-- analytics: users own their events
CREATE POLICY "analytics_owner_all" ON analytics_events FOR ALL USING (auth.uid() = user_id);

-- ─── Trigger: auto-create profile on signup ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ─── Trigger: update updated_at on profiles ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── Tier limits helper ─────────────────────────────────────────────
-- Call this when a user upgrades via Stripe webhook
CREATE OR REPLACE FUNCTION apply_tier_limits(p_user_id UUID, p_tier TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET
    tier                  = p_tier,
    generations_limit     = CASE p_tier
      WHEN 'free'     THEN 10
      WHEN 'starter'  THEN 100
      WHEN 'pro'      THEN -1
      WHEN 'pro_plus' THEN -1
      WHEN 'team'     THEN -1
      ELSE 10
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
