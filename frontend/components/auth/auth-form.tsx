"use client";
import { SignupForm } from "@/components/aceternity/signup-form";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AuthFormProps {
  type: "signup" | "login" | "forgot-password" | "reset-password";
  /** Internal path after login, e.g. from ?next=/auction/room/ABC */
  redirectAfterLogin?: string;
}

function safePostLoginPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/select-team";
  }
  return next;
}

export function AuthForm({ type, redirectAfterLogin }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp, resetPassword, updatePassword, loading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (data: { email: string; password?: string; name?: string }) => {
    setError(null);
    setMessage(null);

    try {
      if (type === "signup") {
        const { error } = await signUp(data.email, data.password!, data.name || "");
        if (error) {
          setError(error.message);
        } else {
          router.push("/select-team");
        }
      } else if (type === "login") {
        const { error } = await signIn(data.email, data.password!);
        if (error) {
          setError(error.message);
        } else {
          router.push(safePostLoginPath(redirectAfterLogin));
        }
      } else if (type === "forgot-password") {
        const { error } = await resetPassword(data.email);
        if (error) {
          setError(error.message);
        } else {
          setMessage("Password reset link sent to your email!");
        }
      } else if (type === "reset-password") {
        const { error } = await updatePassword(data.password!);
        if (error) {
          setError(error.message);
        } else {
          setMessage("Password updated successfully!");
          setTimeout(() => router.push("/login"), 2000);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <SignupForm type={type} onSubmit={handleSubmit} loading={loading} />
        
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-green-400 text-sm">
            {message}
          </div>
        )}

        <div className="text-center space-y-2 text-sm text-white/70">
          {type === "signup" && (
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 hover:underline">
                Sign in
              </Link>
            </p>
          )}
          {type === "login" && (
            <>
              <p>
                Don't have an account?{" "}
                <Link href="/signup" className="text-cyan-400 hover:underline">
                  Sign up
                </Link>
              </p>
              <p>
                <Link href="/forgot-password" className="text-cyan-400 hover:underline">
                  Forgot password?
                </Link>
              </p>
            </>
          )}
          {(type === "signup" || type === "login") && (
            <p>
              <Link href="/" className="text-cyan-400 hover:underline">
                ← Back to home
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
