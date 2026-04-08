/// <reference path="../../_shared/edge-ambient.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, jsonResponse } from "../../_shared/http.ts";
import { requireAuctionInternalSecret } from "../../_shared/internal-secret.ts";
import {
  getAuctionRoomByCode,
  getHumanRoomTeamSeatForUser,
} from "../../_shared/repositories/rooms.ts";
import {
  resolveEdgeServiceRoleKey,
  resolveEdgeSupabaseUrl,
} from "../../_shared/supabase-env.ts";

type EngineBody = {
  roomCode?: string;
  userId?: string;
  /** "start" | "next" */
  action?: string;
};

const ACTIONS = new Set(["start", "next"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authError = requireAuctionInternalSecret(req);
  if (authError) return authError;

  const supabaseUrl = resolveEdgeSupabaseUrl();
  const serviceKey = resolveEdgeServiceRoleKey();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse(500, { error: "Server misconfiguration" });
  }

  let payload: EngineBody;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const roomCodeRaw = payload.roomCode;
  const userId = payload.userId;
  const actionRaw = payload.action;

  if (
    typeof roomCodeRaw !== "string" ||
    !roomCodeRaw.trim().length ||
    typeof userId !== "string" ||
    !userId.length
  ) {
    return jsonResponse(400, { error: "Invalid roomCode or userId" });
  }

  if (typeof actionRaw !== "string" || !ACTIONS.has(actionRaw.trim().toLowerCase())) {
    return jsonResponse(400, { error: "action must be start or next" });
  }

  const roomCode = roomCodeRaw.trim().toUpperCase();
  const action = actionRaw.trim().toLowerCase();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: room, error: roomErr } = await getAuctionRoomByCode(supabase, roomCode);
  if (roomErr) {
    console.error("engine room fetch:", roomErr.message);
    return jsonResponse(500, { error: "Could not load room" });
  }
  if (!room) {
    return jsonResponse(404, { error: "Room not found" });
  }

  const { data: seat, error: seatErr } = await getHumanRoomTeamSeatForUser(
    supabase,
    room.id,
    userId
  );
  if (seatErr) {
    console.error("engine seat fetch:", seatErr.message);
    return jsonResponse(500, { error: "Could not load your seat" });
  }
  if (!seat) {
    return jsonResponse(403, { error: "You must have a human seat in this room" });
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("auction_engine", {
    p_room_id: room.id,
    p_actor_user_id: userId,
    p_action: action,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (/not_room_member/i.test(msg)) {
      return jsonResponse(403, { error: "You must have a human seat in this room" });
    }
    if (/auction_not_in_lobby/i.test(msg)) {
      return jsonResponse(400, { error: "Auction can only start from the lobby" });
    }
    if (/auction_not_in_progress/i.test(msg) || /no_current_lot/i.test(msg)) {
      return jsonResponse(400, { error: "No lot to advance" });
    }
    if (/no_players_in_buckets/i.test(msg)) {
      return jsonResponse(400, { error: "No players available in catalog buckets" });
    }
    console.error("auction_engine rpc:", msg);
    return jsonResponse(500, { error: msg || "Auction engine failed" });
  }

  return jsonResponse(200, {
    ok: true,
    roomId: room.id,
    roomCode: room.room_code,
    ...(typeof rpcData === "object" && rpcData !== null && !Array.isArray(rpcData)
      ? (rpcData as Record<string, unknown>)
      : {}),
  });
});
