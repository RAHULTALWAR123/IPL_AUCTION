"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchIplTeamById,
  type IplTeamRow,
} from "@/lib/repositories/ipl-teams";

export function useIplTeamById(teamId: number | null | undefined) {
  const [team, setTeam] = useState<IplTeamRow | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (teamId == null) {
      setTeam(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await fetchIplTeamById(supabase, teamId);
    if (err) {
      setTeam(null);
      setError(err.message);
    } else {
      setTeam(data);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { team, loading, error, refetch };
}
