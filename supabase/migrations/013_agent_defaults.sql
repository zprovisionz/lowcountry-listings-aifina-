-- ═══════════════════════════════════════════════════════════════════
-- AGENT DEFAULTS + RELIST LINEAGE
--   1. Adds persisted "My Defaults" preferences to profiles.
--   2. Drops the Free-tier generation cap from 10 → 3 and unlocks all
--      output formats (formats are decided client-side from PLAN_LIMITS;
--      the only DB column we adjust here is `generations_limit`).
--   3. Adds `relist_of` to `generations` so a relist remembers its source.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. My Defaults — persisted agent preferences ──────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_tone               TEXT,
  ADD COLUMN IF NOT EXISTS default_formats            JSONB,
  ADD COLUMN IF NOT EXISTS default_amenities_presets  JSONB,
  ADD COLUMN IF NOT EXISTS default_neighborhood       TEXT;

-- Keep default_tone within the supported tone ids when provided.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_default_tone_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_default_tone_check
    CHECK (
      default_tone IS NULL
      OR default_tone IN ('standard','luxury','family','investment')
    );

-- ─── 2. Free tier: 10 → 3 generations / month (formats handled client-side) ─
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

-- Backfill existing Free-tier profiles down to the new monthly cap of 3.
UPDATE profiles SET generations_limit = 3 WHERE tier = 'free' AND generations_limit <> 3;

-- ─── 3. Relist lineage ─────────────────────────────────────────────
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS relist_of UUID REFERENCES generations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_generations_relist_of ON generations(relist_of);
