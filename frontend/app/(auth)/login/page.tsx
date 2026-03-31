import { AuthForm } from "@/components/auth/auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

export default function LoginPage() {
  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <AuthForm type="login" />
      </div>
    </>
  );
}
