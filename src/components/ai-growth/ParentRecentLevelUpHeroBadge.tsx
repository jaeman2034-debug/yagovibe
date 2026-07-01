import { Flame } from "lucide-react";
import { formatLevelUpRelativeDay } from "@/lib/ai-growth/levelUpCelebrationView";
import { cn } from "@/lib/utils";

type Props = {
  levelDelta: number;
  lastLevelUpAt: number;
  className?: string;
};

/** J2-1b — Parent Home Hero recent level-up strip */
export function ParentRecentLevelUpHeroBadge({ levelDelta, lastLevelUpAt, className }: Props) {
  const deltaLabel = levelDelta > 0 ? `+${levelDelta}` : "+1";

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5",
        className
      )}
      data-testid="parent-home-recent-level-up-badge"
      role="status"
    >
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-amber-600" aria-hidden />
        <div>
          <p className="text-xs font-bold text-amber-950">🔥 최근 레벨업</p>
          <p className="text-[10px] text-amber-800">7일 이내</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-black tabular-nums text-amber-950">LEVEL UP {deltaLabel}</p>
        <p className="text-[11px] font-medium text-amber-800">
          {formatLevelUpRelativeDay(lastLevelUpAt)}
        </p>
      </div>
    </div>
  );
}
