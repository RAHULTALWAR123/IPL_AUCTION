import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RoomLobbyTeamsTable } from "@/components/auction/room-lobby-teams";
import { createClient } from "@/lib/supabase/server";
import { AuctionRoomLive } from "@/components/auction/auction-room-live";
import { RoomAuctionActions } from "@/components/auction/room-auction-actions";
import {
  fetchAuctionRoomByCode,
  fetchRoomTeamSlots,
  userHasHumanSeatInRoom,
} from "@/lib/repositories/auction-rooms";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function AuctionRoomLobbyPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim();
  if (!code) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/auction/room/${encodeURIComponent(code)}`);
  }

  const { data: room, error: roomError } = await fetchAuctionRoomByCode(
    supabase,
    code.toUpperCase()
  );

  if (roomError || !room) {
    notFound();
  }

  const isLobby = room.status === "lobby";
  const isActiveAuction =
    room.status === "lobby" || room.status === "in_progress";

  const { data: slots, error: teamsError } = isLobby
    ? await fetchRoomTeamSlots(supabase, room.id)
    : { data: [], error: null };

  const { hasSeat: userHasSeat, error: seatCheckError } =
    await userHasHumanSeatInRoom(supabase, room.id, user.id);

  if (teamsError && isLobby) {
    return (
      <div className="min-h-screen bg-black px-4 py-12 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-red-400">Could not load room teams.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canLeave =
    isActiveAuction &&
    userHasSeat &&
    !seatCheckError;

  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="text-white/70 pl-0 hover:text-white">
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/auction/mode">New room</Link>
          </Button>
        </div>

        <div className="mb-8 text-center sm:text-left">
          <p className="text-sm text-white/50">Room code</p>
          <h1 className="mt-1 font-mono text-3xl font-bold tracking-[0.15em] text-cyan-400 sm:text-4xl">
            {room.room_code}
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isLobby
                  ? "bg-emerald-500/20 text-emerald-300"
                  : room.status === "in_progress"
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-white/10 text-white/60"
              }`}
            >
              {isLobby ? "Lobby" : room.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-white/40">
              {room.mode === "ai" ? "AI auction" : "Multiplayer"}
            </span>
          </div>
        </div>

        {isLobby ? (
          <>
            <p className="mb-4 text-sm text-white/60">
              Teams in this room — budget is per franchise for this auction. Invite
              others with the room code.
            </p>
            <RoomLobbyTeamsTable slots={slots} />
          </>
        ) : null}

        {isLobby ||
        room.status === "in_progress" ||
        room.status === "completed" ? (
          <AuctionRoomLive
            roomId={room.id}
            roomCode={room.room_code}
            initialStatus={room.status}
            initialCurrentPlayerId={room.current_player_id ?? null}
            initialEngineLotSerial={room.engine_lot_serial ?? 0}
            initialEngineCatalogTotal={room.engine_catalog_total ?? 0}
            hasSeat={userHasSeat && !seatCheckError}
          />
        ) : null}

        <RoomAuctionActions roomCode={room.room_code} canLeave={canLeave} />

        <div className="mt-10 flex flex-wrap justify-center gap-4 sm:justify-start">
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
