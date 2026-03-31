"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  type?: "signup" | "login" | "forgot-password" | "reset-password";
  onSubmit?: (data: { email: string; password?: string; name?: string }) => Promise<void>;
  loading?: boolean;
}

export function SignupForm({ type = "signup", onSubmit, loading = false }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit({ email, password, name });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-white/5 p-8 backdrop-blur-sm border border-white/10"
      >
        <h2 className="mb-8 text-2xl font-bold text-white">
          {type === "signup" && "Create Account"}
          {type === "login" && "Welcome Back"}
          {type === "forgot-password" && "Reset Password"}
          {type === "reset-password" && "Set New Password"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          {(type === "signup" || type === "login" || type === "reset-password") && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                {type === "reset-password" ? "New Password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
              />
            </div>
          )}

          <Button
            type="submit"
            className={cn(
              "w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600",
              loading && "opacity-50 cursor-not-allowed"
            )}
            disabled={loading}
          >
            {loading ? "Loading..." : (
              <>
                {type === "signup" && "Sign Up"}
                {type === "login" && "Sign In"}
                {type === "forgot-password" && "Send Reset Link"}
                {type === "reset-password" && "Reset Password"}
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
