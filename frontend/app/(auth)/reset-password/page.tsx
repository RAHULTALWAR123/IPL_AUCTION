"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";
import { exchangeAuthCodeForSession } from "@/lib/repositories/auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      void exchangeAuthCodeForSession(code);
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
