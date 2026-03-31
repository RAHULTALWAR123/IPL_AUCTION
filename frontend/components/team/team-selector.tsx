"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TeamCard } from "./team-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

interface Team {
  id: number;
  name: string;
  short_name: string;
  logo: string | null;
}

export function TeamSelector() {
  const router = useRouter();
  const { profile, updateProfile, fetchProfile } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    profile?.selected_team_id || null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile?.selected_team_id) {
      setSelectedTeamId(profile.selected_team_id);
    }
  }, [profile]);

  const fetchTeams = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ipl_teams")
      .select("*")
      .order("name");

    if (!error && data) {
      setTeams(data);
    }
    setLoading(false);
  };

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            shortName={team.short_name}
            logo={team.logo}
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
