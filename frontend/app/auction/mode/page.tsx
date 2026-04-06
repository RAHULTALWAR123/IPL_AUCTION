"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Cpu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createAuctionRoom } from "@/lib/auction/create-room";

type AuctionMode = "ai" | "multiplayer" | null;

const modeCardBase =
  "rounded-lg border bg-card text-card-foreground shadow-sm w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

type ModeOptionProps = {
  mode: "ai" | "multiplayer";
  selected: AuctionMode;
  onSelect: (mode: "ai" | "multiplayer") => void;
  icon: LucideIcon;
  title: string;
  description: string;
};

function ModeOption({
  mode,
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: ModeOptionProps) {
  const isSelected = selected === mode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={cn(
        modeCardBase,
        "cursor-pointer border-2 p-6",
        isSelected
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-6 w-6 text-cyan-400" aria-hidden />
      </div>
      <p className="mb-2 text-xl font-semibold text-white">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </button>
  );
}

export default function AuctionModePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<AuctionMode>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    setError(null);
    setPending(true);
    createAuctionRoom(selected)
      .then(({ roomCode }) => {
        router.push(`/auction/room/${encodeURIComponent(roomCode)}`);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not create room");
      })
      .finally(() => {
        setPending(false);
      });
  }, [router, selected]);

  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2">
          <Button variant="ghost" className="text-white/70 pl-0 hover:text-white" asChild>
            <Link href="/dashboard">← Back to dashboard</Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Choose auction mode</h1>
        <p className="mb-10 text-white/60">
          Pick how you want to play. Room creation and matchmaking will plug in here
          next.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ModeOption
            mode="ai"
            selected={selected}
            onSelect={setSelected}
            icon={Cpu}
            title="AI auction"
            description="You play as your franchise. The other nine teams are controlled by AI bidders."
          />
          <ModeOption
            mode="multiplayer"
            selected={selected}
            onSelect={setSelected}
            icon={Users}
            title="Multiplayer"
            description="Up to 10 humans in a room. Unfilled slots use AI. Share a room code to invite friends."
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              disabled={!selected || pending}
              className="min-w-[160px]"
              onClick={handleContinue}
            >
              {pending ? "Creating…" : "Continue"}
            </Button>
            {!selected ? (
              <span className="text-sm text-white/40">Select a mode to continue</span>
            ) : null}
            {selected && !error ? (
              <p className="text-sm text-white/50">
                Selected:{" "}
                <span className="text-cyan-400">
                  {selected === "ai" ? "AI auction" : "Multiplayer"}
                </span>
                . Creates a room hosted by your franchise.
              </p>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
