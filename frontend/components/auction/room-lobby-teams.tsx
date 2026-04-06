import { getIplTeamLogoSrc } from "@/lib/ipl-team-assets";
import type { RoomTeamSlot } from "@/lib/repositories/auction-rooms";

type Props = {
  slots: RoomTeamSlot[];
};

export function RoomLobbyTeamsTable({ slots }: Props) {
  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-white/50">
        No teams in this room yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/50">
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium">Budget</th>
            <th className="px-4 py-3 font-medium">Owner</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const logo = slot.shortName ? getIplTeamLogoSrc(slot.shortName) : null;
            return (
              <tr
                key={slot.teamId}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-semibold text-white/80">
                        {slot.shortName || "—"}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-white">{slot.teamName}</div>
                      {slot.shortName ? (
                        <div className="text-xs text-white/45">{slot.shortName}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-white/90">
                  ₹{slot.budgetCr.toFixed(2)} Cr
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      slot.isAi
                        ? "text-violet-300"
                        : slot.ownerLabel === "Open slot"
                          ? "text-white/45"
                          : "text-white/85"
                    }
                  >
                    {slot.ownerLabel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
