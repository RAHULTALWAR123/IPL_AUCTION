/// <reference path="../../_shared/edge-ambient.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, jsonResponse } from "../../_shared/http.ts";
import { requireAuctionInternalSecret } from "../../_shared/internal-secret.ts";
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

  const { data: room, error: roomErr } = await supabase
    .from("auction_rooms")
    .select("id, room_code, host_user_id, status")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (roomErr) {
    console.error("join room fetch:", roomErr.message);
    return jsonResponse(500, { error: "Could not load room" });
  }

  if (!room || typeof room !== "object") {
    return jsonResponse(404, { error: "Room not found" });
  }

  const rid = (room as { id: string }).id;
  const code = (room as { room_code: string }).room_code;
  const hostUserId = (room as { host_user_id: string }).host_user_id;
  const status = String((room as { status: string }).status);

  if (status !== "lobby") {
    return jsonResponse(400, { error: "Room is not accepting joins (lobby only)" });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, selected_team_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("join profile:", profileErr.message);
    return jsonResponse(500, { error: "Could not load profile" });
  }

  if (!profile) {
    return jsonResponse(400, { error: "Profile not found" });
  }

  const selectedTeamId = (profile as { selected_team_id: number | null })
    .selected_team_id;
  if (selectedTeamId == null) {
    return jsonResponse(400, { error: "Select a franchise before joining" });
  }
  if (selectedTeamId !== teamId) {
    return jsonResponse(400, { error: "Team does not match your profile" });
  }

  const { data: hostSeat, error: hostSeatErr } = await supabase
    .from("room_teams")
    .select("id, user_id, team_id")
    .eq("room_id", rid)
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (hostSeatErr) {
    console.error("join host seat:", hostSeatErr.message);
    return jsonResponse(500, { error: "Could not check existing seat" });
  }

  if (hostSeat && userId === hostUserId) {
    return jsonResponse(200, { roomId: rid, roomCode: code });
  }

  const { data: userRows, error: userRowsErr } = await supabase
    .from("room_teams")
    .select("id")
    .eq("room_id", rid)
    .eq("user_id", userId)
    .limit(1);

  if (userRowsErr) {
    console.error("join user rows:", userRowsErr.message);
    return jsonResponse(500, { error: "Could not check membership" });
  }

  if (userRows && userRows.length > 0) {
    return jsonResponse(409, { error: "Already in this room" });
  }

  const { data: teamRows, error: teamRowsErr } = await supabase
    .from("room_teams")
    .select("id")
    .eq("room_id", rid)
    .eq("team_id", teamId)
    .limit(1);

  if (teamRowsErr) {
    console.error("join team rows:", teamRowsErr.message);
    return jsonResponse(500, { error: "Could not check franchise" });
  }

  if (teamRows && teamRows.length > 0) {
    return jsonResponse(409, { error: "Franchise already taken in this room" });
  }

  const { error: insertErr } = await supabase.from("room_teams").insert({
    room_id: rid,
    team_id: teamId,
    user_id: userId,
    is_ai: false,
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
