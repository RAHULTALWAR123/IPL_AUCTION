"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroMeshGradient() {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black/[0.96] antialiased">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 z-0 h-full w-full">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-purple-500 opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="bg-gradient-to-b from-neutral-200 to-neutral-600 bg-clip-text text-4xl font-bold text-transparent md:text-7xl">
            Welcome to IPL Auction
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-500 md:text-xl">
            Build your dream IPL team through live auctions. Compete with other managers, bid on your favorite players, and create the ultimate squad.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
