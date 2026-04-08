"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { postAuctionEngine } from "@/lib/auction/engine";
import type { PlayerCatalogRow } from "@/lib/repositories/players";
import { createClient } from "@/lib/supabase/client";

type AuctionRoomLiveProps = {
  roomId: string;
  roomCode: string;
  initialStatus: string;
  initialCurrentPlayerId: number | null;
  initialEngineLotSerial: number;
  initialEngineCatalogTotal: number;
  hasSeat: boolean;
};

export function AuctionRoomLive({
  roomId,
  roomCode,
  initialStatus,
  initialCurrentPlayerId,
  initialEngineLotSerial,
  initialEngineCatalogTotal,
  hasSeat,
}: AuctionRoomLiveProps) {
  const [status, setStatus] = useState(initialStatus);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(
    initialCurrentPlayerId
  );
  const [engineLotSerial, setEngineLotSerial] = useState(initialEngineLotSerial);
  const [engineCatalogTotal, setEngineCatalogTotal] = useState(
    initialEngineCatalogTotal
  );
  const [player, setPlayer] = useState<PlayerCatalogRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyRoomRow = useCallback((row: Record<string, unknown>) => {
    if (typeof row.status === "string") setStatus(row.status);
    if ("current_player_id" in row) {
      const v = row.current_player_id;
      if (v === null || v === undefined) setCurrentPlayerId(null);
      else setCurrentPlayerId(Number(v));
    }
    if (typeof row.engine_lot_serial === "number") {
      setEngineLotSerial(row.engine_lot_serial);
    }
    if (typeof row.engine_catalog_total === "number") {
      setEngineCatalogTotal(row.engine_catalog_total);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`auction_room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auction_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            applyRoomRow(payload.new as Record<string, unknown>);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, applyRoomRow]);

  useEffect(() => {
    if (currentPlayerId == null) {
      setPlayer(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      setLoadError(null);
      const { data, error } = await supabase
        .from("players")
        .select(
          "id, name, role, nationality, is_overseas, base_price, set_category, set_order, matches, runs, batting_avg, strike_rate, wickets, bowling_avg, economy, image_url"
        )
        .eq("id", currentPlayerId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setPlayer(null);
        return;
      }
      setPlayer((data ?? null) as PlayerCatalogRow | null);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPlayerId]);

  const handleStart = useCallback(async () => {
    if (!hasSeat || actionPending) return;
    setActionError(null);
    setActionPending(true);
    try {
      const json = await postAuctionEngine(roomCode, "start");
      if (json.roomStatus) setStatus(json.roomStatus);
      if (json.currentPlayerId !== undefined) {
        setCurrentPlayerId(
          json.currentPlayerId === null || json.currentPlayerId === undefined
            ? null
            : Number(json.currentPlayerId)
        );
      }
      if (typeof json.engineLotSerial === "number") {
        setEngineLotSerial(json.engineLotSerial);
      }
      if (typeof json.engineCatalogTotal === "number") {
        setEngineCatalogTotal(json.engineCatalogTotal);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setActionPending(false);
    }
  }, [hasSeat, actionPending, roomCode]);

  const handleNext = useCallback(async () => {
    if (!hasSeat || actionPending) return;
    setActionError(null);
    setActionPending(true);
    try {
      const json = await postAuctionEngine(roomCode, "next");
      if (json.roomStatus) setStatus(json.roomStatus);
      if (json.currentPlayerId !== undefined) {
        setCurrentPlayerId(
          json.currentPlayerId === null || json.currentPlayerId === undefined
            ? null
            : Number(json.currentPlayerId)
        );
      }
      if (typeof json.engineLotSerial === "number") {
        setEngineLotSerial(json.engineLotSerial);
      }
      if (typeof json.engineCatalogTotal === "number") {
        setEngineCatalogTotal(json.engineCatalogTotal);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not advance");
    } finally {
      setActionPending(false);
    }
  }, [hasSeat, actionPending, roomCode]);

  const inLobby = status === "lobby";
  const inProgress = status === "in_progress";
  const completed = status === "completed";

  const lotLabel =
    inProgress && currentPlayerId != null && engineCatalogTotal > 0
      ? `Lot ${engineLotSerial + 1} of ${engineCatalogTotal}`
      : null;

  if (completed) {
    return (
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-lg font-medium text-white">Auction finished</p>
        <p className="mt-2 text-sm text-white/50">
          {engineCatalogTotal > 0
            ? `${engineLotSerial} player${engineLotSerial === 1 ? "" : "s"} closed (unsold for testing).`
            : "This auction is complete."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {inLobby && hasSeat ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            type="button"
            className="bg-cyan-600 text-white hover:bg-cyan-500"
            disabled={actionPending}
            onClick={handleStart}
          >
            {actionPending ? "Starting…" : "Start auction"}
          </Button>
        </div>
      ) : null}

      {inProgress ? (
        <>
          {lotLabel ? (
            <p className="text-center text-sm font-medium text-cyan-300/90">{lotLabel}</p>
          ) : null}

          {loadError ? (
            <p className="text-center text-sm text-red-400">{loadError}</p>
          ) : null}

          {player ? (
            <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-b from-white/[0.06] to-transparent px-5 py-6">
              <h2 className="text-center text-2xl font-bold text-white">{player.name}</h2>
              <p className="mt-1 text-center text-sm text-white/55">
                {player.role.replace(/_/g, " ")} · {player.set_category} ·{" "}
                {player.is_overseas ? "Overseas" : player.nationality}
              </p>
              <p className="mt-3 text-center text-sm text-cyan-200/80">
                Base ₹{player.base_price} Cr
              </p>
              <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Stat k="Matches" v={String(player.matches)} />
                <Stat k="Runs" v={String(player.runs)} />
                <Stat k="Bat Avg" v={fmtOpt(player.batting_avg)} />
                <Stat k="Strike rate" v={fmtOpt(player.strike_rate)} />
                <Stat k="Wickets" v={String(player.wickets)} />
                <Stat k="Bowl Avg" v={fmtOpt(player.bowling_avg)} />
                <Stat k="Economy" v={fmtOpt(player.economy)} />
              </dl>
            </div>
          ) : currentPlayerId != null ? (
            <p className="text-center text-white/50">Loading player…</p>
          ) : null}

          {hasSeat ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                disabled={actionPending || currentPlayerId == null}
                onClick={handleNext}
              >
                {actionPending ? "Working…" : "Next (test, unsold)"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-white/45">
              Join a franchise to control the auction.
            </p>
          )}
        </>
      ) : null}

      {actionError ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-white/45">{k}</dt>
      <dd className="text-right font-mono text-white/90">{v}</dd>
    </>
  );
}

function fmtOpt(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}
