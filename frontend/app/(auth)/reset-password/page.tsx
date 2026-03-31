"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Exchange the code from the URL for a session
    const code = searchParams.get("code");
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code);
    }
  }, [searchParams]);

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <AuthForm type="reset-password" />
      </div>
    </>
  );
}
