"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMyActiveAuctionRooms,
  type MyActiveAuctionRoom,
} from "@/lib/repositories/auction-rooms";

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

    const supabase = createClient();
    void fetchMyActiveAuctionRooms(supabase, userId).then(
      ({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setRooms(data);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { rooms, loading, error };
}
