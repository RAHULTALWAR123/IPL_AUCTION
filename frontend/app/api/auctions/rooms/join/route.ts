import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileByUserId } from "@/lib/repositories/profiles";

export const runtime = "nodejs";

type JoinBody = {
  roomCode?: unknown;
};

function functionsJoinRoomUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return `${trimmed}/functions/v1/join-auction-room`;
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

  let body: JoinBody;
  try {
    body = (await request.json()) as JoinBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const roomCode =
    typeof body.roomCode === "string" ? body.roomCode.trim() : "";
  if (!roomCode) {
    return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await fetchProfileByUserId(
    supabase,
    user.id
  );

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const teamId = profile.selected_team_id;
  if (teamId == null) {
    return NextResponse.json(
      { error: "Select a team before joining a room" },
      { status: 400 }
    );
  }

  const edgeRes = await fetch(functionsJoinRoomUrl(supabaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      "x-auction-internal-secret": secret,
    },
    body: JSON.stringify({
      roomCode,
      userId: user.id,
      teamId,
    }),
  });

  const edgeJson = (await edgeRes.json().catch(() => ({}))) as {
    error?: string;
    roomId?: string;
    roomCode?: string;
  };

  if (!edgeRes.ok) {
    return NextResponse.json(
      {
        error:
          typeof edgeJson.error === "string"
            ? edgeJson.error
            : "Could not join room",
      },
      { status: edgeRes.status >= 400 && edgeRes.status < 600 ? edgeRes.status : 502 }
    );
  }

  if (!edgeJson.roomId || !edgeJson.roomCode) {
    return NextResponse.json(
      { error: "Invalid response from auction service" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    roomId: edgeJson.roomId,
    roomCode: edgeJson.roomCode,
  });
}
