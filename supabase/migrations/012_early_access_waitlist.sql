-- Early access waitlist for Market Intelligence (real MLS comps, ETA Q3 2026).
-- Anyone (anon or authenticated) can self-subscribe by inserting their email.
-- Reads are restricted to service_role only — the list is private operator data.

CREATE TABLE IF NOT EXISTS early_access_waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'reports',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness on email so duplicate signups don't pile up.
CREATE UNIQUE INDEX IF NOT EXISTS early_access_waitlist_email_lower_idx
  ON early_access_waitlist ((lower(email)));

CREATE INDEX IF NOT EXISTS early_access_waitlist_source_idx
  ON early_access_waitlist (source);

ALTER TABLE early_access_waitlist ENABLE ROW LEVEL SECURITY;

-- INSERT: allow both anonymous landing visitors and signed-in users to subscribe.
DROP POLICY IF EXISTS "early_access_waitlist_insert_anon"          ON early_access_waitlist;
DROP POLICY IF EXISTS "early_access_waitlist_insert_authenticated" ON early_access_waitlist;

CREATE POLICY "early_access_waitlist_insert_anon"
  ON early_access_waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "early_access_waitlist_insert_authenticated"
  ON early_access_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT / UPDATE / DELETE: no policies for anon or authenticated.
-- service_role bypasses RLS, so operators can read the list via the dashboard
-- or via Edge Functions that use the service role key.
