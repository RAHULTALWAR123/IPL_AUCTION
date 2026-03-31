"use client";
import { ThreeDCard } from "@/components/aceternity/3d-card";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  id: number;
  name: string;
  shortName: string;
  logo?: string | null;
  isSelected?: boolean;
  onSelect: (id: number) => void;
}

export function TeamCard({ id, name, shortName, logo, isSelected, onSelect }: TeamCardProps) {
  return (
    <ThreeDCard
      containerClassName="cursor-pointer"
      className={cn(
        "h-full transition-all duration-300",
        isSelected && "ring-4 ring-cyan-500 ring-offset-2"
      )}
    >
      <Card
        className={cn(
          "h-full p-6 text-center transition-all duration-300 hover:bg-accent",
          isSelected && "bg-cyan-500/10 border-cyan-500"
        )}
        onClick={() => onSelect(id)}
      >
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="mx-auto mb-4 h-24 w-24 object-contain"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-2xl font-bold text-white">
            {shortName}
          </div>
        )}
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{shortName}</p>
        {isSelected && (
          <div className="mt-4 text-sm font-semibold text-cyan-500">Selected</div>
        )}
      </Card>
    </ThreeDCard>
  );
}
