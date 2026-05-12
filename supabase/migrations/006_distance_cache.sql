-- Distance Matrix results cache (90-day TTL). Service role writes from Edge Functions.

CREATE TABLE IF NOT EXISTS distance_cache (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address_hash     TEXT NOT NULL UNIQUE,
  address_raw        TEXT NOT NULL,
  landmark_distances JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_distance_cache_address_hash ON distance_cache (address_hash);

ALTER TABLE distance_cache ENABLE ROW LEVEL SECURITY;

-- No policies: authenticated/anon cannot read or write; service_role bypasses RLS for Edge Functions.
