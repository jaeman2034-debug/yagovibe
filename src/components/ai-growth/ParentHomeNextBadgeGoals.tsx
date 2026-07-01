import { Target } from "lucide-react";
import { nextBadgeHints } from "@/lib/ai-growth/avatarGrowthEngine";
import { formatNextBadgeGoalLine } from "@/lib/ai-growth/formatNextBadgeGoal";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
  maxItems?: number;
};

/** Sprint D-4.4 — Parent Home 다음 배지 목표 */
export function ParentHomeNextBadgeGoals({ avatar, className, maxItems = 3 }: Props) {
  const hints = nextBadgeHints({
    vision: avatar.vision,
    pressure: avatar.pressure,
    recovery: avatar.recovery,
    ovr: avatar.ovr,
    sessionCount: avatar.sessionCount,
  }).slice(0, maxItems);

  if (hints.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-violet-200 bg-white/60 px-3 py-2 text-xs text-violet-800",
          className
        )}
        data-testid="parent-home-next-goals-empty"
      >
        모든 성장 배지를 획득했어요! 🎉
      </p>
    );
  }

  return (
    <div className={cn("rounded-xl border border-violet-200 bg-white/80 px-3 py-2.5", className)} data-testid="parent-home-next-goals">
      <p className="flex items-center gap-1.5 text-xs font-bold text-violet-950">
        <Target className="h-3.5 w-3.5 text-violet-600" aria-hidden />
        다음 목표
      </p>
      <ul className="mt-2 space-y-1.5">
        {hints.map(({ badge, remaining, unit }) => (
          <li
            key={badge.id}
            className="flex items-center justify-between gap-2 text-xs text-violet-900"
            data-testid={`parent-home-next-goal-${badge.id}`}
          >
            <span>
              {badge.emoji} {formatNextBadgeGoalLine(badge, remaining, unit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
