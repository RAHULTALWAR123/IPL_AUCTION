-- Atomic room creation for Edge / service_role RPC (bypasses RLS inside SECURITY DEFINER).
-- Do not grant EXECUTE to anon or authenticated; only service_role.

CREATE OR REPLACE FUNCTION public.create_auction_room(
  p_host_user_id UUID,
  p_mode TEXT,
  p_host_team_id INTEGER
)
RETURNS TABLE (room_id UUID, room_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('multiplayer', 'ai') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_host_user_id) THEN
    RAISE EXCEPTION 'host profile not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ipl_teams WHERE id = p_host_team_id) THEN
    RAISE EXCEPTION 'invalid team';
  END IF;

  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    v_attempts := v_attempts + 1;
    IF v_attempts > 30 THEN
      RAISE EXCEPTION 'could not generate unique room code';
    END IF;
    BEGIN
      INSERT INTO public.auction_rooms (room_code, host_user_id, mode)
      VALUES (v_code, p_host_user_id, p_mode)
      RETURNING id INTO v_room_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  INSERT INTO public.room_teams (room_id, team_id, user_id, is_ai)
  VALUES (v_room_id, p_host_team_id, p_host_user_id, false);

  RETURN QUERY SELECT v_room_id, v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_auction_room(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_auction_room(UUID, TEXT, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_auction_room(UUID, TEXT, INTEGER) TO service_role;
