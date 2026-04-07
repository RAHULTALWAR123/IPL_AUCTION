"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { leaveAuctionRoom } from "@/lib/auction/leave-room";

type RoomAuctionActionsProps = {
  roomCode: string;
  canLeave: boolean;
};

export function RoomAuctionActions({
  roomCode,
  canLeave,
}: RoomAuctionActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = useCallback(async () => {
    if (!canLeave || pending) return;
    if (!confirm("Leave this room? You may need the code to rejoin if your seat is freed.")) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      await leaveAuctionRoom(roomCode);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not leave");
    } finally {
      setPending(false);
    }
  }, [canLeave, pending, roomCode, router]);

  if (!canLeave) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={handleLeave}
        className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
      >
        {pending ? "Leaving…" : "Leave room"}
      </Button>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
