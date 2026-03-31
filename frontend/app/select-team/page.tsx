import { TeamSelector } from "@/components/team/team-selector";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

export default function SelectTeamPage() {
  return (
    <>
      <AuroraBackground />
      <div className="relative z-10">
        <TeamSelector />
      </div>
    </>
  );
}
