-- ═══════════════════════════════════════════════════════════════════
-- LOWCOUNTRY LISTINGS AI — STAGING QUEUE + STORAGE
-- Migration 003
-- ═══════════════════════════════════════════════════════════════════

-- ─── staging_queue ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staging_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id   UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url    TEXT NOT NULL,
  staged_url      TEXT,
  staging_style   TEXT NOT NULL DEFAULT 'coastal_lowcountry',
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','processing','complete','error')),
  error_message   TEXT,
  fal_request_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staging_user_id      ON staging_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_staging_generation   ON staging_queue(generation_id);
CREATE INDEX IF NOT EXISTS idx_staging_status       ON staging_queue(status);

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE staging_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_owner_all" ON staging_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "staging_team_read" ON staging_queue FOR SELECT
  USING (
    user_id IN (
      SELECT p2.id FROM profiles p2
      WHERE p2.team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
      AND (SELECT team_id FROM profiles WHERE id = auth.uid()) IS NOT NULL
    )
  );

-- ─── Trigger: updated_at ────────────────────────────────────────────
DROP TRIGGER IF EXISTS staging_queue_updated_at ON staging_queue;
CREATE TRIGGER staging_queue_updated_at
  BEFORE UPDATE ON staging_queue
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── Enable Realtime for staging_queue ──────────────────────────────
-- Run in Supabase Dashboard: Database → Replication → supabase_realtime publication
-- Or uncomment and run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE staging_queue;

-- ─── RPC: increment_staging_count ───────────────────────────────────
-- Called after a successful staging job completes
CREATE OR REPLACE FUNCTION increment_staging_count(p_staging_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM staging_queue WHERE id = p_staging_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT team_id INTO v_team_id FROM profiles WHERE id = v_user_id;

  UPDATE profiles
  SET staging_credits_used = staging_credits_used + 1
  WHERE id = v_user_id;

  IF v_team_id IS NOT NULL THEN
    UPDATE teams
    SET shared_staging_used = shared_staging_used + 1
    WHERE id = v_team_id;
  END IF;
END;
$$;

-- ─── RPC: check_staging_quota ───────────────────────────────────────
-- Returns true if user has remaining staging credits
CREATE OR REPLACE FUNCTION check_staging_quota(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used  INT;
  v_limit INT;
BEGIN
  SELECT staging_credits_used, staging_credits_limit
    INTO v_used, v_limit
    FROM profiles WHERE id = p_user_id;
  -- -1 = unlimited
  IF v_limit = -1 THEN RETURN TRUE; END IF;
  RETURN v_used < v_limit;
END;
$$;

-- ─── Storage bucket: property-photos ────────────────────────────────
-- Creates a public bucket for uploaded property photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  10485760, -- 10MB per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "photos_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read of all photos
CREATE POLICY "photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-photos');

-- Allow users to delete their own photos
CREATE POLICY "photos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'property-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
