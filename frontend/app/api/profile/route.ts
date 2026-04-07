import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchProfileByUserId,
  updateProfileByUserId,
} from "@/lib/repositories/profiles";
import { fetchIplTeamById } from "@/lib/repositories/ipl-teams";
import { fetchMyActiveAuctionRooms } from "@/lib/repositories/auction-rooms";

export const runtime = "nodejs";

const ALLOWED_FIELDS = new Set(["name", "selected_team_id"]);

type PatchBody = Record<string, unknown>;

export async function PATCH(request: Request) {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const forbidden = keys.filter((k) => !ALLOWED_FIELDS.has(k));
  if (forbidden.length > 0) {
    return NextResponse.json(
      { error: `Cannot update field(s): ${forbidden.join(", ")}` },
      { status: 403 }
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

  const { data: existingProfile, error: profileLoadError } =
    await fetchProfileByUserId(supabase, user.id);

  if (profileLoadError || !existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  if ("selected_team_id" in body) {
    const teamId = body.selected_team_id;
    if (teamId !== null) {
      if (typeof teamId !== "number" || !Number.isInteger(teamId)) {
        return NextResponse.json(
          { error: "selected_team_id must be an integer or null" },
          { status: 400 }
        );
      }
      const { data: team } = await fetchIplTeamById(supabase, teamId);
      if (!team) {
        return NextResponse.json(
          { error: "Team not found" },
          { status: 400 }
        );
      }
    }

    const currentTeamId = existingProfile.selected_team_id;
    const nextTeamId =
      teamId === null ? null : (teamId as number);
    const teamIsChanging =
      (currentTeamId ?? null) !== (nextTeamId ?? null);

    if (teamIsChanging) {
      const { data: activeRooms, error: roomsError } =
        await fetchMyActiveAuctionRooms(supabase, user.id);

      if (roomsError) {
        return NextResponse.json(
          { error: roomsError.message },
          { status: 500 }
        );
      }

      if (activeRooms.length > 0) {
        return NextResponse.json(
          {
            error:
              "You cannot change franchise while you are in a lobby or in-progress auction. Finish or leave those rooms first.",
          },
          { status: 409 }
        );
      }
    }
  }

  if ("name" in body && body.name !== null && typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name must be a string or null" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  for (const key of keys) {
    updates[key] = body[key];
  }

  const { error: updateError } = await updateProfileByUserId(
    supabase,
    user.id,
    updates
  );

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  const { data: profile, error: profileError } = await fetchProfileByUserId(
    supabase,
    user.id
  );

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile updated but could not reload" },
      { status: 200 }
    );
  }

  return NextResponse.json({ profile });
}
