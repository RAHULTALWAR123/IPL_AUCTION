"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (!profile?.selected_team_id) {
      router.push("/select-team");
    }
  }, [user, profile, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-white/70">Welcome back, {profile.name || user.email}!</p>
        </div>
        <Button onClick={handleSignOut} variant="outline">
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-semibold text-white">Your Team</h2>
          <p className="text-white/70">
            {profile.selected_team_id ? `Team ID: ${profile.selected_team_id}` : "No team selected"}
          </p>
          <Link href="/select-team">
            <Button className="mt-4" variant="outline">
              Change Team
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

      <div className="mt-8 text-center">
        <p className="text-white/50">Auction features coming soon...</p>
      </div>
    </div>
  );
}
