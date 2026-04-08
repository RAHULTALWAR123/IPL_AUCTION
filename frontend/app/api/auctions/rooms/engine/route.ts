import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EngineBody = {
  roomCode?: unknown;
  action?: unknown;
};

function functionsControlEngineUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return `${trimmed}/functions/v1/control-auction-engine`;
}

export async function POST(request: Request) {
  const secret = process.env.AUCTION_INTERNAL_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret || !supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: EngineBody;
  try {
    body = (await request.json()) as EngineBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const roomCode =
    typeof body.roomCode === "string" ? body.roomCode.trim() : "";
  const action =
    typeof body.action === "string" ? body.action.trim().toLowerCase() : "";

  if (!roomCode) {
    return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
  }
  if (action !== "start" && action !== "next") {
    return NextResponse.json(
      { error: "action must be start or next" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edgeRes = await fetch(functionsControlEngineUrl(supabaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      "x-auction-internal-secret": secret,
    },
    body: JSON.stringify({
      roomCode,
      userId: user.id,
      action,
    }),
  });

  const edgeJson = (await edgeRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!edgeRes.ok) {
    const err =
      typeof edgeJson.error === "string" ? edgeJson.error : "Auction engine failed";
    return NextResponse.json(
      { error: err },
      { status: edgeRes.status >= 400 && edgeRes.status < 600 ? edgeRes.status : 502 }
    );
  }

  return NextResponse.json(edgeJson);
}
