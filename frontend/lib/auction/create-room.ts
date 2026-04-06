export type CreateRoomMode = "multiplayer" | "ai";

export type CreateRoomResponse = {
  roomId: string;
  roomCode: string;
};

/**
 * Server-verified create room (POST /api/auctions/rooms). Session cookie required.
 */
export async function createAuctionRoom(
  mode: CreateRoomMode
): Promise<CreateRoomResponse> {
  const res = await fetch("/api/auctions/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
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
