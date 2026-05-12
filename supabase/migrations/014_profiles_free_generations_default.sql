-- Align DB default and remaining free rows with product cap (3/mo).
-- `handle_new_user` inserts only id/email/name/avatar — new rows pick up column DEFAULT.
-- `apply_tier_limits` free tier is set in migration 013 (3, not 10).

ALTER TABLE profiles ALTER COLUMN generations_limit SET DEFAULT 3;

UPDATE profiles
SET generations_limit = 3
WHERE tier = 'free' AND generations_limit = 10;
