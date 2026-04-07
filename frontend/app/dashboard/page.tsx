import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileByUserId } from "@/lib/repositories/profiles";
import { fetchIplTeamById } from "@/lib/repositories/ipl-teams";
import { fetchMyActiveAuctionRooms } from "@/lib/repositories/auction-rooms";
import { getIplTeamLogoSrc } from "@/lib/ipl-team-assets";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await fetchProfileByUserId(supabase, user.id);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.selected_team_id) {
    redirect("/select-team");
  }

  const [teamResult, roomsResult] = await Promise.all([
    fetchIplTeamById(supabase, profile.selected_team_id),
    fetchMyActiveAuctionRooms(supabase, user.id),
  ]);

  const team = teamResult.data;
  const teamLogoSrc = team ? getIplTeamLogoSrc(team.short_name) : null;
  const activeRooms = roomsResult.data;

  return (
    <DashboardClient
      profile={profile}
      userEmail={user.email ?? ""}
      team={team}
      teamLogoSrc={teamLogoSrc}
      activeRooms={activeRooms}
    />
  );
}
