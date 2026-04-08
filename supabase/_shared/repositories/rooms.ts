import type { EdgeDbError, EdgeServiceRoleSupabase } from "../edge-supabase-types.ts";

export type AuctionRoomLobbyRow = {
  id: string;
  room_code: string;
  host_user_id: string;
  status: string;
};

export type ProfileTeamRow = {
  id: string;
  selected_team_id: number | null;
};

export type RoomTeamSeatRow = {
  id: string;
  user_id: string | null;
  team_id: number;
};

const ACTIVE_AUCTION_STATUSES = ["lobby", "in_progress"] as const;

/**
 * Distinct room IDs (lobby or in_progress) where the user is host or has a human seat.
 * Used to enforce one active auction at a time.
 */
export async function listActiveAuctionRoomIdsForUser(
  client: EdgeServiceRoleSupabase,
  userId: string
): Promise<{ ids: string[]; error: EdgeDbError }> {
  const { data: hostRows, error: hostErr } = await client
    .from("auction_rooms")
    .select("id")
    .eq("host_user_id", userId)
    .in("status", [...ACTIVE_AUCTION_STATUSES])
    .limit(100);

  if (hostErr) return { ids: [], error: hostErr };

  const { data: memberRows, error: memberErr } = await client
    .from("room_teams")
    .select("room_id")
    .eq("user_id", userId)
    .limit(500);

  if (memberErr) return { ids: [], error: memberErr };

  const memberRoomIds = [
    ...new Set(
      (memberRows ?? [])
        .map((r) => (r as { room_id: string }).room_id)
        .filter(Boolean)
    ),
  ];

  let memberActiveIds: string[] = [];
  if (memberRoomIds.length > 0) {
    const { data: activeMemberRooms, error: roomsErr } = await client
      .from("auction_rooms")
      .select("id")
      .in("id", memberRoomIds)
      .in("status", [...ACTIVE_AUCTION_STATUSES])
      .limit(100);

    if (roomsErr) return { ids: [], error: roomsErr };
    memberActiveIds = (activeMemberRooms ?? [])
      .map((r) => (r as { id: string }).id)
      .filter(Boolean);
  }

  const byId = new Set<string>();
  for (const r of hostRows ?? []) {
    const id = (r as { id: string }).id;
    if (id) byId.add(id);
  }
  for (const id of memberActiveIds) {
    byId.add(id);
  }

  return { ids: [...byId], error: null };
}

/**
 * Service-role Supabase client: room and membership queries for Edge handlers.
 */
export async function getAuctionRoomByCode(
  client: EdgeServiceRoleSupabase,
  roomCode: string
): Promise<{ data: AuctionRoomLobbyRow | null; error: EdgeDbError }> {
  const { data, error } = await client
    .from("auction_rooms")
    .select("id, room_code, host_user_id, status")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data || typeof data !== "object") return { data: null, error: null };
  return { data: data as AuctionRoomLobbyRow, error: null };
}

export async function getProfileForJoin(
  client: EdgeServiceRoleSupabase,
  userId: string
): Promise<{ data: ProfileTeamRow | null; error: EdgeDbError }> {
  const { data, error } = await client
    .from("profiles")
    .select("id, selected_team_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data || typeof data !== "object") return { data: null, error: null };
  return { data: data as ProfileTeamRow, error: null };
}

export async function getHostSeatIfExists(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  userId: string,
  teamId: number
): Promise<{ data: RoomTeamSeatRow | null; error: EdgeDbError }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id, user_id, team_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data || typeof data !== "object") return { data: null, error: null };
  return { data: data as RoomTeamSeatRow, error: null };
}

export async function userHasSeatInRoom(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  userId: string
): Promise<{ hasSeat: boolean; error: EdgeDbError }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .limit(1);

  if (error) return { hasSeat: false, error };
  return { hasSeat: !!(data && data.length > 0), error: null };
}

export async function teamFranchiseTakenInRoom(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  teamId: number
): Promise<{ taken: boolean; error: EdgeDbError }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id")
    .eq("room_id", roomId)
    .eq("team_id", teamId)
    .limit(1);

  if (error) return { taken: false, error };
  return { taken: !!(data && data.length > 0), error: null };
}

export async function insertHumanRoomTeam(
  client: EdgeServiceRoleSupabase,
  row: {
    room_id: string;
    team_id: number;
    user_id: string;
  }
): Promise<{ error: EdgeDbError }> {
  const { error } = await client.from("room_teams").insert({
    room_id: row.room_id,
    team_id: row.team_id,
    user_id: row.user_id,
    is_ai: false,
  });
  return { error };
}

export type RoomTeamSeatForUserRow = {
  id: number;
  user_id: string | null;
  team_id: number;
};

/** Human seat for this user in this room (any team row). */
export async function getRoomTeamSeatForUser(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  userId: string
): Promise<{ data: RoomTeamSeatForUserRow | null; error: EdgeDbError }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id, user_id, team_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .limit(1);

  if (error) return { data: null, error };
  const row = data?.[0];
  if (!row || typeof row !== "object") return { data: null, error: null };
  return { data: row as RoomTeamSeatForUserRow, error: null };
}

/** Human franchise row only (`is_ai = false`). Use for auction-engine membership. */
export async function getHumanRoomTeamSeatForUser(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  userId: string
): Promise<{ data: RoomTeamSeatForUserRow | null; error: EdgeDbError }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id, user_id, team_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .eq("is_ai", false)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data || typeof data !== "object") return { data: null, error: null };
  return { data: data as RoomTeamSeatForUserRow, error: null };
}

export async function deleteRoomTeamSeatForUser(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  userId: string
): Promise<{ error: EdgeDbError }> {
  const { error } = await client
    .from("room_teams")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  return { error };
}

export async function convertRoomTeamSeatToAi(
  client: EdgeServiceRoleSupabase,
  seatId: number
): Promise<{ error: EdgeDbError }> {
  const { error } = await client
    .from("room_teams")
    .update({
      user_id: null,
      is_ai: true,
    })
    .eq("id", seatId);
  return { error };
}

/**
 * After a user leaves their seat: if they were host_user_id, pick next human host
 * (lowest room_teams.id) or mark room completed.
 */
export async function reassignHostOrCompleteRoom(
  client: EdgeServiceRoleSupabase,
  roomId: string,
  leavingUserId: string,
  currentHostUserId: string
): Promise<{ error: EdgeDbError }> {
  if (currentHostUserId !== leavingUserId) {
    return { error: null };
  }

  const { data: rows, error: selErr } = await client
    .from("room_teams")
    .select("id, user_id")
    .eq("room_id", roomId)
    .eq("is_ai", false)
    .order("id", { ascending: true })
    .limit(50);

  if (selErr) return { error: selErr };

  const first = (rows ?? []).find(
    (r) => (r as { user_id: string | null }).user_id != null
  ) as { id: number; user_id: string } | undefined;
  if (first?.user_id) {
    const { error: upErr } = await client
      .from("auction_rooms")
      .update({ host_user_id: first.user_id })
      .eq("id", roomId);
    return { error: upErr };
  }

  const { error: doneErr } = await client
    .from("auction_rooms")
    .update({ status: "completed" })
    .eq("id", roomId);
  return { error: doneErr };
}
