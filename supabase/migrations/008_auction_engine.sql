-- Auction engine v1: room queue state + SECURITY DEFINER RPC (service_role only).
-- Bucket shuffle/refill uses ORDER BY random() inside Postgres (Option A).

ALTER TABLE public.auction_rooms
  ADD COLUMN IF NOT EXISTS pending_player_ids INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS engine_bucket_index SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engine_lot_serial INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engine_catalog_total INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.auction_rooms.pending_player_ids IS 'Upcoming player ids in current bucket (excludes current_player_id).';
COMMENT ON COLUMN public.auction_rooms.engine_bucket_index IS '0-based index into fixed bucket order in auction_engine().';
COMMENT ON COLUMN public.auction_rooms.engine_lot_serial IS 'Closed lots count; next closed row uses serial+1 for auction_order.';
COMMENT ON COLUMN public.auction_rooms.engine_catalog_total IS 'Snapshot of count(players) at auction start; UI progress.';

CREATE OR REPLACE FUNCTION public.auction_engine(
  p_room_id UUID,
  p_actor_user_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buckets TEXT[] := ARRAY[
    'marquee',
    'batters_core',
    'batters_pool',
    'bowlers_core',
    'bowlers_pool'
  ];
  v_member BOOLEAN;
  v_room RECORD;
  i INT;
  j INT;
  v_cat TEXT;
  v_arr INTEGER[];
  v_head INTEGER;
  v_tail INTEGER[];
  v_serial INTEGER;
  v_total INTEGER;
  v_bucket_idx SMALLINT;
  v_pending INTEGER[];
  v_current INTEGER;
  v_action TEXT;
BEGIN
  v_action := lower(trim(p_action));

  SELECT EXISTS (
    SELECT 1 FROM public.room_teams rt
    WHERE rt.room_id = p_room_id
      AND rt.user_id = p_actor_user_id
      AND rt.is_ai = false
  )
  INTO v_member;

  IF NOT v_member THEN
    RAISE EXCEPTION 'not_room_member';
  END IF;

  SELECT * INTO v_room
  FROM public.auction_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  IF v_action = 'start' THEN
    IF v_room.status IS DISTINCT FROM 'lobby'::public.auction_room_status THEN
      RAISE EXCEPTION 'auction_not_in_lobby';
    END IF;

    DELETE FROM public.auction_players WHERE room_id = p_room_id;

    SELECT count(*)::INT INTO v_total FROM public.players;

    FOR i IN 1..coalesce(array_length(v_buckets, 1), 0) LOOP
      v_cat := v_buckets[i];
      SELECT ARRAY(
        SELECT pr.id
        FROM public.players pr
        WHERE pr.set_category = v_cat
        ORDER BY random()
      )
      INTO v_arr;

      IF coalesce(array_length(v_arr, 1), 0) > 0 THEN
        v_head := v_arr[1];
        IF array_length(v_arr, 1) = 1 THEN
          v_tail := ARRAY[]::INTEGER[];
        ELSE
          v_tail := v_arr[2:array_length(v_arr, 1)];
        END IF;

        UPDATE public.auction_rooms
        SET
          status = 'in_progress'::public.auction_room_status,
          current_player_id = v_head,
          pending_player_ids = v_tail,
          engine_bucket_index = (i - 1)::SMALLINT,
          engine_lot_serial = 0,
          engine_catalog_total = v_total
        WHERE id = p_room_id;

        RETURN jsonb_build_object(
          'ok', true,
          'action', 'start',
          'roomStatus', 'in_progress',
          'currentPlayerId', v_head,
          'engineCatalogTotal', v_total,
          'engineLotSerial', 0
        );
      END IF;
    END LOOP;

    RAISE EXCEPTION 'no_players_in_buckets';

  ELSIF v_action = 'next' THEN
    IF v_room.status IS DISTINCT FROM 'in_progress'::public.auction_room_status THEN
      RAISE EXCEPTION 'auction_not_in_progress';
    END IF;
    IF v_room.current_player_id IS NULL THEN
      RAISE EXCEPTION 'no_current_lot';
    END IF;

    v_current := v_room.current_player_id;
    v_serial := v_room.engine_lot_serial + 1;
    v_bucket_idx := v_room.engine_bucket_index;
    v_pending := v_room.pending_player_ids;

    INSERT INTO public.auction_players (
      room_id,
      player_id,
      status,
      sold_to_team_id,
      sold_price,
      auction_order
    )
    VALUES (
      p_room_id,
      v_current,
      'unsold'::public.auction_player_status,
      NULL,
      NULL,
      v_serial
    );

    IF coalesce(array_length(v_pending, 1), 0) > 0 THEN
      v_head := v_pending[1];
      IF array_length(v_pending, 1) = 1 THEN
        v_tail := ARRAY[]::INTEGER[];
      ELSE
        v_tail := v_pending[2:array_length(v_pending, 1)];
      END IF;

      UPDATE public.auction_rooms
      SET
        engine_lot_serial = v_serial,
        current_player_id = v_head,
        pending_player_ids = v_tail
      WHERE id = p_room_id;

      RETURN jsonb_build_object(
        'ok', true,
        'action', 'next',
        'roomStatus', 'in_progress',
        'currentPlayerId', v_head,
        'engineLotSerial', v_serial,
        'engineCatalogTotal', v_room.engine_catalog_total
      );
    END IF;

    FOR j IN (v_bucket_idx + 2)..coalesce(array_length(v_buckets, 1), 0) LOOP
      v_cat := v_buckets[j];
      SELECT ARRAY(
        SELECT pr.id
        FROM public.players pr
        WHERE pr.set_category = v_cat
        ORDER BY random()
      )
      INTO v_arr;

      IF coalesce(array_length(v_arr, 1), 0) > 0 THEN
        v_head := v_arr[1];
        IF array_length(v_arr, 1) = 1 THEN
          v_tail := ARRAY[]::INTEGER[];
        ELSE
          v_tail := v_arr[2:array_length(v_arr, 1)];
        END IF;

        UPDATE public.auction_rooms
        SET
          engine_lot_serial = v_serial,
          current_player_id = v_head,
          pending_player_ids = v_tail,
          engine_bucket_index = (j - 1)::SMALLINT
        WHERE id = p_room_id;

        RETURN jsonb_build_object(
          'ok', true,
          'action', 'next',
          'roomStatus', 'in_progress',
          'currentPlayerId', v_head,
          'engineLotSerial', v_serial,
          'engineCatalogTotal', v_room.engine_catalog_total
        );
      END IF;
    END LOOP;

    UPDATE public.auction_rooms
    SET
      engine_lot_serial = v_serial,
      status = 'completed'::public.auction_room_status,
      current_player_id = NULL,
      pending_player_ids = ARRAY[]::INTEGER[]
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
      'ok', true,
      'action', 'next',
      'roomStatus', 'completed',
      'currentPlayerId', NULL,
      'engineLotSerial', v_serial,
      'engineCatalogTotal', v_room.engine_catalog_total
    );
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.auction_engine(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auction_engine(UUID, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auction_engine(UUID, UUID, TEXT) TO service_role;
