"use client";

export type AuctionEngineAction = "start" | "next";

export async function postAuctionEngine(roomCode: string, action: AuctionEngineAction) {
  const res = await fetch("/api/auctions/rooms/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode, action }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    currentPlayerId?: number | null;
    roomStatus?: string;
    engineLotSerial?: number;
    engineCatalogTotal?: number;
  };

  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : "Auction engine failed");
  }

  return json;
}
