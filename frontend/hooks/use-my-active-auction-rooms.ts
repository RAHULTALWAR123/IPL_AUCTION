"use client";

import { useEffect, useState } from "react";
import type { MyActiveAuctionRoom } from "@/lib/repositories/auction-rooms";

export function useMyActiveAuctionRooms(userId: string | undefined) {
  const [rooms, setRooms] = useState<MyActiveAuctionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRooms([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/me/active-rooms")
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          rooms?: MyActiveAuctionRoom[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || json.error) {
          setError(json.error ?? `Request failed (${res.status})`);
        } else {
          setRooms(json.rooms ?? []);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { rooms, loading, error };
}
