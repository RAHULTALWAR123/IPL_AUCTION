/// <reference path="../../_shared/edge-ambient.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, jsonResponse } from "../../_shared/http.ts";
import { requireAuctionInternalSecret } from "../../_shared/internal-secret.ts";
import {
  resolveEdgeServiceRoleKey,
  resolveEdgeSupabaseUrl,
} from "../../_shared/supabase-env.ts";

type CreateRoomBody = {
  hostUserId?: string;
  hostTeamId?: number;
  mode?: string;
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
    console.error(
      "Missing FUNCTION_URL or SUPABASE_URL, or SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY"
    );
    return jsonResponse(500, { error: "Server misconfiguration" });
  }

  let payload: CreateRoomBody;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const hostUserId = payload.hostUserId;
  const hostTeamId = payload.hostTeamId;
  const mode = payload.mode;

  if (
    typeof hostUserId !== "string" ||
    !hostUserId.length ||
    typeof hostTeamId !== "number" ||
    !Number.isInteger(hostTeamId) ||
    typeof mode !== "string"
  ) {
    return jsonResponse(400, { error: "Invalid hostUserId, hostTeamId, or mode" });
  }

  if (mode !== "multiplayer" && mode !== "ai") {
    return jsonResponse(400, { error: "mode must be multiplayer or ai" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("create_auction_room", {
    p_host_user_id: hostUserId,
    p_mode: mode,
    p_host_team_id: hostTeamId,
  });

  if (error) {
    console.error("create_auction_room RPC error:", error.message);
    const msg =
      error.message.includes("invalid") || error.message.includes("not found")
        ? error.message
        : "Could not create room";
    const status =
      error.message.includes("not found") || error.message.includes("invalid")
        ? 400
        : 500;
    return jsonResponse(status, { error: msg });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return jsonResponse(500, { error: "Unexpected RPC response" });
  }

  const rid = (row as { room_id?: string }).room_id;
  const code = (row as { room_code?: string }).room_code;
  if (!rid || !code) {
    return jsonResponse(500, { error: "Missing room fields in RPC response" });
  }

  return jsonResponse(200, { roomId: rid, roomCode: code });
});
