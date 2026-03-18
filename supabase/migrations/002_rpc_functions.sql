-- ─── append_staged_photo ────────────────────────────────────────────────
-- Atomically appends a staged photo URL to a generation's staged_photo_urls array
CREATE OR REPLACE FUNCTION append_staged_photo(p_generation_id UUID, p_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE generations
  SET staged_photo_urls = array_append(COALESCE(staged_photo_urls, '{}'), p_url)
  WHERE id = p_generation_id;
END;
$$;

-- ─── increment_generation_count ───────────────────────────────────────
-- Called by the edge function after a successful generation
-- Increments the user's usage counter (respects team shared quota)
CREATE OR REPLACE FUNCTION increment_generation_count(p_generation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
BEGIN
  -- Get user from generation
  SELECT user_id INTO v_user_id FROM generations WHERE id = p_generation_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Get team (if any)
  SELECT team_id INTO v_team_id FROM profiles WHERE id = v_user_id;

  -- Update personal counter
  UPDATE profiles
  SET generations_used = generations_used + 1
  WHERE id = v_user_id;

  -- Update team counter if applicable
  IF v_team_id IS NOT NULL THEN
    UPDATE teams
    SET shared_generations_used = shared_generations_used + 1
    WHERE id = v_team_id;
  END IF;
END;
$$;
