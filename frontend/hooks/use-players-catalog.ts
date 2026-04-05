"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPlayersCatalog,
  type PlayerCatalogRow,
} from "@/lib/repositories/players";

export function usePlayersCatalog(enabled = true) {
  const [players, setPlayers] = useState<PlayerCatalogRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await fetchPlayersCatalog(supabase);
    if (err) {
      setPlayers([]);
      setError(err.message);
    } else {
      setPlayers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  return { players, loading, error, refetch };
}
