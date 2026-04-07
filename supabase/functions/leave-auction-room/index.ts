/// <reference path="../../_shared/edge-ambient.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, jsonResponse } from "../../_shared/http.ts";
import { requireAuctionInternalSecret } from "../../_shared/internal-secret.ts";
import {
  convertRoomTeamSeatToAi,
  deleteRoomTeamSeatForUser,
  getAuctionRoomByCode,
  getRoomTeamSeatForUser,
  reassignHostOrCompleteRoom,
} from "../../_shared/repositories/rooms.ts";
import {
  resolveEdgeServiceRoleKey,
  resolveEdgeSupabaseUrl,
} from "../../_shared/supabase-env.ts";

type LeaveBody = {
  roomCode?: string;
  userId?: string;
};

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

  let payload: LeaveBody;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const roomCodeRaw = payload.roomCode;
  const userId = payload.userId;

  if (
    typeof roomCodeRaw !== "string" ||
    !roomCodeRaw.trim().length ||
    typeof userId !== "string" ||
    !userId.length
  ) {
    return jsonResponse(400, { error: "Invalid roomCode or userId" });
  }

  const roomCode = roomCodeRaw.trim().toUpperCase();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: room, error: roomErr } = await getAuctionRoomByCode(supabase, roomCode);
  if (roomErr) {
    console.error("leave room fetch:", roomErr.message);
    return jsonResponse(500, { error: "Could not load room" });
  }
  if (!room) {
    return jsonResponse(404, { error: "Room not found" });
  }

  const rid = room.id;
  const code = room.room_code;
  const status = String(room.status);
  const hostUserId = room.host_user_id;

  if (status === "completed") {
    return jsonResponse(400, { error: "This auction is already finished" });
  }

  if (status !== "lobby" && status !== "in_progress") {
    return jsonResponse(400, { error: "Cannot leave this room in its current state" });
  }

  const { data: seat, error: seatErr } = await getRoomTeamSeatForUser(
    supabase,
    rid,
    userId
  );
  if (seatErr) {
    console.error("leave seat fetch:", seatErr.message);
    return jsonResponse(500, { error: "Could not load your seat" });
  }
  if (!seat) {
    return jsonResponse(404, { error: "You are not in this room" });
  }

  if (status === "lobby") {
    const { error: delErr } = await deleteRoomTeamSeatForUser(supabase, rid, userId);
    if (delErr) {
      console.error("leave delete seat:", delErr.message);
      return jsonResponse(500, { error: "Could not leave room" });
    }
  } else {
    const { error: aiErr } = await convertRoomTeamSeatToAi(supabase, seat.id);
    if (aiErr) {
      console.error("leave ai convert:", aiErr.message);
      return jsonResponse(500, { error: "Could not leave room" });
    }
  }

  const { error: hostErr } = await reassignHostOrCompleteRoom(
    supabase,
    rid,
    userId,
    hostUserId
  );
  if (hostErr) {
    console.error("leave host handoff:", hostErr.message);
    return jsonResponse(500, { error: "Could not update room after leave" });
  }

  return jsonResponse(200, { ok: true, roomId: rid, roomCode: code });
});
