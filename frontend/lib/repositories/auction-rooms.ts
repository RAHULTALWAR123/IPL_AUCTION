import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuctionRoomRow {
  id: string;
  room_code: string;
  host_user_id: string;
  mode: string;
  status: string;
  /** Present when migration `008_auction_engine` is applied. */
  current_player_id?: number | null;
  engine_lot_serial?: number;
  engine_catalog_total?: number;
}

/** Rooms the user hosts or has a seat in, with lobby / in_progress status only. */
export interface MyActiveAuctionRoom {
  id: string;
  room_code: string;
  status: string;
  mode: string;
  isHost: boolean;
}

type TeamEmbed = { name: string; short_name: string };
type ProfileEmbed = { name: string | null };

type RoomTeamJoinRow = {
  team_id: number;
  budget_remaining: string | number;
  is_ai: boolean;
  user_id: string | null;
  ipl_teams: TeamEmbed | TeamEmbed[] | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export interface RoomTeamSlot {
  teamId: number;
  teamName: string;
  shortName: string;
  budgetCr: number;
  ownerLabel: string;
  isAi: boolean;
}

export async function fetchAuctionRoomByCode(
  client: SupabaseClient,
  roomCode: string
): Promise<{ data: AuctionRoomRow | null; error: Error | null }> {
  const normalized = roomCode.trim();
  if (!normalized) {
    return { data: null, error: null };
  }

  const { data, error } = await client
    .from("auction_rooms")
    .select(
      "id, room_code, host_user_id, mode, status, current_player_id, engine_lot_serial, engine_catalog_total"
    )
    .eq("room_code", normalized)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as AuctionRoomRow | null, error: null };
}

export async function fetchRoomTeamSlots(
  client: SupabaseClient,
  roomId: string
): Promise<{ data: RoomTeamSlot[]; error: Error | null }> {
  const { data, error } = await client
    .from("room_teams")
    .select(
      `
      team_id,
      budget_remaining,
      is_ai,
      user_id,
      ipl_teams ( name, short_name ),
      profiles ( name )
    `
    )
    .eq("room_id", roomId)
    .order("team_id", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = data as unknown as RoomTeamJoinRow[];
  const slots: RoomTeamSlot[] = (rows ?? []).map((row) => {
    const team = one(row.ipl_teams);
    const profile = one(row.profiles);
    const teamName = team?.name ?? `Team #${row.team_id}`;
    const shortName = team?.short_name ?? "";
    const budgetNum =
      typeof row.budget_remaining === "string"
        ? parseFloat(row.budget_remaining)
        : Number(row.budget_remaining);

    let ownerLabel = "Open slot";
    if (row.is_ai) {
      ownerLabel = "AI";
    } else if (row.user_id && profile?.name) {
      ownerLabel = profile.name;
    } else if (row.user_id) {
      ownerLabel = "Player";
    }

    return {
      teamId: row.team_id,
      teamName,
      shortName,
      budgetCr: Number.isFinite(budgetNum) ? budgetNum : 0,
      ownerLabel,
      isAi: row.is_ai,
    };
  });

  return { data: slots, error: null };
}

export async function userHasHumanSeatInRoom(
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<{ hasSeat: boolean; error: Error | null }> {
  const { data, error } = await client
    .from("room_teams")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { hasSeat: false, error: new Error(error.message) };
  }
  return { hasSeat: !!data, error: null };
}

const ACTIVE_ROOM_STATUSES = ["lobby", "in_progress"] as const;

export async function fetchMyActiveAuctionRooms(
  client: SupabaseClient,
  userId: string
): Promise<{ data: MyActiveAuctionRoom[]; error: Error | null }> {
  const { data: hostRows, error: hostErr } = await client
    .from("auction_rooms")
    .select("id, room_code, host_user_id, mode, status")
    .eq("host_user_id", userId)
    .in("status", [...ACTIVE_ROOM_STATUSES]);

  if (hostErr) {
    return { data: [], error: new Error(hostErr.message) };
  }

  const { data: memberRows, error: memberErr } = await client
    .from("room_teams")
    .select("room_id")
    .eq("user_id", userId);

  if (memberErr) {
    return { data: [], error: new Error(memberErr.message) };
  }

  const memberRoomIds = [
    ...new Set(
      (memberRows ?? [])
        .map((r: { room_id: string }) => r.room_id)
        .filter(Boolean)
    ),
  ];

  let memberRooms: AuctionRoomRow[] = [];
  if (memberRoomIds.length > 0) {
    const { data: rows, error: roomsErr } = await client
      .from("auction_rooms")
      .select("id, room_code, host_user_id, mode, status")
      .in("id", memberRoomIds)
      .in("status", [...ACTIVE_ROOM_STATUSES]);

    if (roomsErr) {
      return { data: [], error: new Error(roomsErr.message) };
    }
    memberRooms = (rows ?? []) as AuctionRoomRow[];
  }

  const byId = new Map<string, MyActiveAuctionRoom>();

  for (const r of (hostRows ?? []) as AuctionRoomRow[]) {
    byId.set(r.id, {
      id: r.id,
      room_code: r.room_code,
      status: r.status,
      mode: r.mode,
      isHost: true,
    });
  }

  for (const r of memberRooms) {
    const isRoomHost = r.host_user_id === userId;
    const existing = byId.get(r.id);
    if (existing) {
      if (isRoomHost) existing.isHost = true;
    } else {
      byId.set(r.id, {
        id: r.id,
        room_code: r.room_code,
        status: r.status,
        mode: r.mode,
        isHost: isRoomHost,
      });
    }
  }

  const list = [...byId.values()].sort((a, b) =>
    a.room_code.localeCompare(b.room_code)
  );

  return { data: list, error: null };
}
