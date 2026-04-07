/// <reference path="../../_shared/edge-ambient.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, jsonResponse } from "../../_shared/http.ts";
import { requireAuctionInternalSecret } from "../../_shared/internal-secret.ts";
import {
  getAuctionRoomByCode,
  getHostSeatIfExists,
  getProfileForJoin,
  insertHumanRoomTeam,
  listActiveAuctionRoomIdsForUser,
  teamFranchiseTakenInRoom,
  userHasSeatInRoom,
} from "../../_shared/repositories/rooms.ts";
import {
  resolveEdgeServiceRoleKey,
  resolveEdgeSupabaseUrl,
} from "../../_shared/supabase-env.ts";

type JoinBody = {
  roomCode?: string;
  userId?: string;
  teamId?: number;
};

function isUniqueViolation(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "23505" || (err.message ?? "").includes("duplicate key");
}

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

  let payload: JoinBody;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const roomCodeRaw = payload.roomCode;
  const userId = payload.userId;
  const teamId = payload.teamId;

  if (
    typeof roomCodeRaw !== "string" ||
    !roomCodeRaw.trim().length ||
    typeof userId !== "string" ||
    !userId.length ||
    typeof teamId !== "number" ||
    !Number.isInteger(teamId)
  ) {
    return jsonResponse(400, { error: "Invalid roomCode, userId, or teamId" });
  }

  const roomCode = roomCodeRaw.trim().toUpperCase();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: room, error: roomErr } = await getAuctionRoomByCode(supabase, roomCode);
  if (roomErr) {
    console.error("join room fetch:", roomErr.message);
    return jsonResponse(500, { error: "Could not load room" });
  }
  if (!room) {
    return jsonResponse(404, { error: "Room not found" });
  }

  const rid = room.id;
  const code = room.room_code;
  const hostUserId = room.host_user_id;
  const status = String(room.status);

  if (status !== "lobby") {
    return jsonResponse(400, { error: "Room is not accepting joins (lobby only)" });
  }

  const { ids: activeRoomIds, error: activeErr } =
    await listActiveAuctionRoomIdsForUser(supabase, userId);
  if (activeErr) {
    console.error("join room active check:", activeErr.message);
    return jsonResponse(500, { error: "Could not verify existing auctions" });
  }
  const participatingInOtherActiveRoom = activeRoomIds.some((id) => id !== rid);
  if (participatingInOtherActiveRoom) {
    return jsonResponse(403, {
      error:
        "You are already in an active auction. Finish or leave it before joining another room.",
    });
  }

  const { data: profile, error: profileErr } = await getProfileForJoin(supabase, userId);
  if (profileErr) {
    console.error("join profile:", profileErr.message);
    return jsonResponse(500, { error: "Could not load profile" });
  }
  if (!profile) {
    return jsonResponse(400, { error: "Profile not found" });
  }

  const selectedTeamId = profile.selected_team_id;
  if (selectedTeamId == null) {
    return jsonResponse(400, { error: "Select a franchise before joining" });
  }
  if (selectedTeamId !== teamId) {
    return jsonResponse(400, { error: "Team does not match your profile" });
  }

  const { data: hostSeat, error: hostSeatErr } = await getHostSeatIfExists(
    supabase,
    rid,
    userId,
    teamId
  );
  if (hostSeatErr) {
    console.error("join host seat:", hostSeatErr.message);
    return jsonResponse(500, { error: "Could not check existing seat" });
  }
  if (hostSeat && userId === hostUserId) {
    return jsonResponse(200, { roomId: rid, roomCode: code });
  }

  const { hasSeat, error: userRowsErr } = await userHasSeatInRoom(supabase, rid, userId);
  if (userRowsErr) {
    console.error("join user rows:", userRowsErr.message);
    return jsonResponse(500, { error: "Could not check membership" });
  }
  if (hasSeat) {
    return jsonResponse(409, { error: "Already in this room" });
  }

  const { taken, error: teamRowsErr } = await teamFranchiseTakenInRoom(
    supabase,
    rid,
    teamId
  );
  if (teamRowsErr) {
    console.error("join team rows:", teamRowsErr.message);
    return jsonResponse(500, { error: "Could not check franchise" });
  }
  if (taken) {
    return jsonResponse(409, { error: "Franchise already taken in this room" });
  }

  const { error: insertErr } = await insertHumanRoomTeam(supabase, {
    room_id: rid,
    team_id: teamId,
    user_id: userId,
  });

  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      return jsonResponse(409, {
        error:
          "Cannot join (franchise taken or you already have a seat in this room)",
      });
    }
    console.error("join insert:", insertErr.message);
    return jsonResponse(500, { error: "Could not join room" });
  }

  return jsonResponse(200, { roomId: rid, roomCode: code });
});
