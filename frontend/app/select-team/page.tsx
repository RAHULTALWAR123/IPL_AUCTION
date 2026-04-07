import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileByUserId } from "@/lib/repositories/profiles";
import { fetchIplTeams } from "@/lib/repositories/ipl-teams";
import { TeamSelector } from "@/components/team/team-selector";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

export default async function SelectTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [teamsResult, profileResult] = await Promise.all([
    fetchIplTeams(supabase),
    fetchProfileByUserId(supabase, user.id),
  ]);

  const teams = teamsResult.data;
  const currentTeamId = profileResult.data?.selected_team_id ?? null;

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <TeamSelector teams={teams} currentTeamId={currentTeamId} />
      </div>
    </>
  );
}
