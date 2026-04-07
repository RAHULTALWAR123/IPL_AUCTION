export type LeaveRoomResponse = {
  ok: boolean;
  roomId?: string;
  roomCode?: string;
};

/**
 * Leave an auction room (POST /api/auctions/rooms/leave). Session cookie required.
 */
export async function leaveAuctionRoom(roomCode: string): Promise<LeaveRoomResponse> {
  const trimmed = roomCode.trim();
  if (!trimmed) {
    throw new Error("Room code is required");
  }

  const res = await fetch("/api/auctions/rooms/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode: trimmed }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    roomId?: string;
    roomCode?: string;
  };

  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`
    );
  }

  return {
    ok: body.ok === true,
    roomId: body.roomId,
    roomCode: body.roomCode,
  };
}
