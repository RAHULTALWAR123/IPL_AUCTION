"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchIplTeams, type IplTeamRow } from "@/lib/repositories/ipl-teams";

export function useIplTeams() {
  const [teams, setTeams] = useState<IplTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await fetchIplTeams(supabase);
    if (err) {
      setTeams([]);
      setError(err.message);
    } else {
      setTeams(data);
      if (!data.length) {
        setError(
          "No teams found. Seed ipl_teams in Supabase and ensure SELECT RLS allows reads."
        );
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { teams, loading, error, refetch };
}
