export type JoinRoomResponse = {
  roomId: string;
  roomCode: string;
};

/**
 * Join an auction room (POST /api/auctions/rooms/join). Session cookie required.
 */
export async function joinAuctionRoom(roomCode: string): Promise<JoinRoomResponse> {
  const trimmed = roomCode.trim();
  if (!trimmed) {
    throw new Error("Enter a room code");
  }

  const res = await fetch("/api/auctions/rooms/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode: trimmed }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    roomId?: string;
    roomCode?: string;
  };

  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`
    );
  }

  if (!body.roomId || !body.roomCode) {
    throw new Error("Invalid response from server");
  }

  return { roomId: body.roomId, roomCode: body.roomCode };
}
