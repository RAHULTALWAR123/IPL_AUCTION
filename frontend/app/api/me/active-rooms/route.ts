import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMyActiveAuctionRooms } from "@/lib/repositories/auction-rooms";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rooms, error: roomsError } = await fetchMyActiveAuctionRooms(
    supabase,
    user.id
  );

  if (roomsError) {
    return NextResponse.json(
      { error: roomsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ rooms });
}
