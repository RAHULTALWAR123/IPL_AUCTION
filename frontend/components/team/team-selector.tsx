"use client";
import { useEffect, useState } from "react";
import { TeamCard } from "./team-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useIplTeams } from "@/hooks/use-ipl-teams";

export function TeamSelector() {
  const router = useRouter();
  const { profile, updateProfile, fetchProfile } = useAuthStore();
  const { teams, loading, error: teamsError } = useIplTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    profile?.selected_team_id || null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.selected_team_id) {
      setSelectedTeamId(profile.selected_team_id);
    }
  }, [profile]);

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
  };

  const handleSave = async () => {
    if (!selectedTeamId) return;

    setSaving(true);
    const { error } = await updateProfile({ selected_team_id: selectedTeamId });
    setSaving(false);

    if (!error) {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">
          Select Your IPL Team
        </h1>
        <p className="text-lg text-white/70">
          Choose your favorite team to represent in the auction
        </p>
      </div>

      {teamsError && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {teamsError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            shortName={team.short_name}
            isSelected={selectedTeamId === team.id}
            onSelect={handleSelectTeam}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button
          onClick={handleSave}
          disabled={!selectedTeamId || saving}
          size="lg"
          className="min-w-[200px]"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
