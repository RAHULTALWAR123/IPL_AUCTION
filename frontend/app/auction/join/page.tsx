"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinAuctionRoom } from "@/lib/auction/join-room";

export default function JoinAuctionRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(() => {
    const trimmed = code.trim();
    setError(null);
    if (!trimmed) {
      setError("Enter a room code");
      return;
    }
    setPending(true);
    joinAuctionRoom(trimmed)
      .then(({ roomCode }) => {
        router.push(`/auction/room/${encodeURIComponent(roomCode)}`);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not join room");
      })
      .finally(() => setPending(false));
  }, [code, router]);

  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Button variant="ghost" className="text-white/70 pl-0 hover:text-white" asChild>
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">Join a room</h1>
        <p className="mb-8 text-sm text-white/60">
          Enter the room code the host shared. You join as your current franchise
          from your profile.
        </p>

        <label htmlFor="room-code" className="mb-2 block text-sm font-medium text-white/80">
          Room code
        </label>
        <input
          id="room-code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3D4"
          className="mb-6 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-lg tracking-wider text-white placeholder:text-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />

        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={handleJoin}
        >
          {pending ? "Joining…" : "Join room"}
        </Button>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-white/45">
          <Link href="/auction/mode" className="text-cyan-400 hover:underline">
            Create a room instead
          </Link>
        </p>
      </div>
    </div>
  );
}
