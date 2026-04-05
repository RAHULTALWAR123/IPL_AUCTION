"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Cpu, Users } from "lucide-react";

type AuctionMode = "ai" | "multiplayer" | null;

export default function AuctionModePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<AuctionMode>(null);

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
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setSelected("ai")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected("ai");
            }}
            className={cn(
              "cursor-pointer border-2 p-6 transition-colors",
              selected === "ai"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            )}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <Cpu className="h-6 w-6 text-cyan-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">AI auction</h2>
            <p className="text-sm text-white/60">
              You play as your franchise. The other nine teams are controlled by AI
              bidders.
            </p>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setSelected("multiplayer")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected("multiplayer");
            }}
            className={cn(
              "cursor-pointer border-2 p-6 transition-colors",
              selected === "multiplayer"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            )}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <Users className="h-6 w-6 text-cyan-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Multiplayer</h2>
            <p className="text-sm text-white/60">
              Up to 10 humans in a room. Unfilled slots use AI. Share a room code to
              invite friends.
            </p>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-8">
          <Button
            disabled={!selected}
            className="min-w-[160px]"
            onClick={() => {
              /* UI-only: wire to create/join room later */
              router.push("/dashboard");
            }}
          >
            Continue
          </Button>
          {!selected && (
            <span className="text-sm text-white/40">Select a mode to continue</span>
          )}
          {selected && (
            <span className="text-sm text-white/50">
              Selected:{" "}
              <span className="text-cyan-400">
                {selected === "ai" ? "AI auction" : "Multiplayer"}
              </span>{" "}
              — flow coming soon (returns to dashboard for now).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
