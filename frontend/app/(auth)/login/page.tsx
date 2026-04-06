import { AuthForm } from "@/components/auth/auth-form";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <AuthForm type="login" redirectAfterLogin={next} />
      </div>
    </>
  );
}
