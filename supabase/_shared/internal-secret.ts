import { jsonResponse } from "./http.ts";

const HEADER = "x-auction-internal-secret";

/** Returns a 401 Response if invalid; otherwise null. */
export function requireAuctionInternalSecret(req: Request): Response | null {
  const expected = Deno.env.get("AUCTION_INTERNAL_SECRET");
  const provided = req.headers.get(HEADER);
  if (!expected || provided !== expected) {
    return jsonResponse(401, { error: "Unauthorized" });
  }
  return null;
}
