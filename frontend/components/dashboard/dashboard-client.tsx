"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types/profile";
import type { IplTeamRow } from "@/lib/repositories/ipl-teams";
import type { MyActiveAuctionRoom } from "@/lib/repositories/auction-rooms";

interface DashboardClientProps {
  profile: Profile;
  userEmail: string;
  team: IplTeamRow | null;
  teamLogoSrc: string | null;
  activeRooms: MyActiveAuctionRoom[];
}

export function DashboardClient({
  profile,
  userEmail,
  team,
  teamLogoSrc,
  activeRooms,
}: DashboardClientProps) {
  const router = useRouter();
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-white/70">
            Welcome back, {profile.name || userEmail}!
          </p>
        </div>
        <Button onClick={handleSignOut} variant="outline">
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">Your franchise</h2>
          {team ? (
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
              {teamLogoSrc ? (
                <img
                  src={teamLogoSrc}
                  alt={team.name}
                  className="h-20 w-20 shrink-0 object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-lg font-bold">
                  {team.short_name}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-white">{team.name}</p>
                <p className="text-sm text-white/60">{team.short_name}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/70 text-sm">Could not load team details.</p>
          )}
          <Link href="/select-team">
            <Button className="mt-4" variant="outline">
              Change team
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-semibold text-white">Budget</h2>
          <p className="text-2xl font-bold text-white">₹{profile.budget} Cr</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-semibold text-white">Squad</h2>
          <p className="text-white/70">{profile.squad.length} players</p>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-2 text-lg font-semibold text-white">Auction</h2>
        <p className="mb-4 max-w-xl text-sm text-white/60">
          Start an AI-only draft or join a multiplayer room. You will pick the mode on
          the next screen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/auction/mode">Choose auction mode</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auction/join">Join with code</Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-2 text-lg font-semibold text-white">Your active auctions</h2>
        <p className="mb-4 text-sm text-white/60">
          Lobby and in-progress rooms you host or play in. Completed rooms are hidden.
        </p>
        {activeRooms.length === 0 ? (
          <p className="text-sm text-white/45">No active rooms yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
            {activeRooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-lg font-semibold tracking-wider text-cyan-400">
                    {room.room_code}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
                    <span
                      className={
                        room.status === "lobby"
                          ? "text-emerald-400"
                          : "text-amber-300"
                      }
                    >
                      {room.status === "lobby" ? "Lobby" : "In progress"}
                    </span>
                    <span className="text-white/30">·</span>
                    <span>{room.mode === "ai" ? "AI" : "Multiplayer"}</span>
                    {room.isHost ? (
                      <>
                        <span className="text-white/30">·</span>
                        <span className="text-white/50">Host</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <Button asChild variant="outline" className="shrink-0">
                  <Link
                    href={`/auction/room/${encodeURIComponent(room.room_code)}`}
                  >
                    Rejoin
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
