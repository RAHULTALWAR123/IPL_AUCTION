"use client";

import { useState } from "react";
import { TeamCard } from "./team-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { IplTeamRow } from "@/lib/repositories/ipl-teams";

interface TeamSelectorProps {
  teams: IplTeamRow[];
  currentTeamId: number | null;
}

export function TeamSelector({ teams, currentTeamId }: TeamSelectorProps) {
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    currentTeamId
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedTeamId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_team_id: selectedTeamId }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

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

      {teams.length === 0 && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          No teams found. Seed ipl_teams in Supabase and ensure SELECT RLS allows reads.
        </div>
      )}

      {error && (
        <div
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
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
            onSelect={setSelectedTeamId}
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
