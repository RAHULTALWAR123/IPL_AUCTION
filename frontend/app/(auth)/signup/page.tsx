import { AuthForm } from "@/components/auth/auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

export default function SignupPage() {
  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <AuthForm type="signup" />
      </div>
    </>
  );
}
