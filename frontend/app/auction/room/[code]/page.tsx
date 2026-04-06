import Link from "next/link";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function AuctionRoomLobbyPage({ params }: PageProps) {
  const { code } = await params;

  return (
    <div className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm text-white/50">Room</p>
        <h1 className="mt-2 font-mono text-4xl font-bold tracking-[0.2em] text-cyan-400">
          {decodeURIComponent(code)}
        </h1>
        <p className="mt-6 text-white/60">
          Lobby UI, invites, and realtime state will go here. Share this code with
          friends to join.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auction/mode">Auction mode</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
