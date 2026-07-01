import { PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import type { GrowthLevelUpEvent } from "@/lib/ai-growth/growthAvatarLevelUp";

type Props = {
  event: GrowthLevelUpEvent;
  badgeLabels?: string[];
  className?: string;
  onDismiss?: () => void;
};

/** Sprint D-4.1 / J2-1 — Step5 · Parent 레벨업 축하 카드 */
export function LevelUpCelebrationCard({ event, badgeLabels = [], className, onDismiss }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-md",
        className
      )}
      data-testid="level-up-celebration-card"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-orange-200/30 blur-xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-6 w-6 text-amber-600" aria-hidden />
          <p className="text-lg font-black text-amber-950">레벨 업!</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-amber-800/80 hover:text-amber-950"
          >
            닫기
          </button>
        ) : null}
      </div>

      <p className="relative mt-2 text-xl font-black text-gray-900">{event.playerName}</p>

      <p className="relative mt-3 text-base font-bold text-amber-950">
        {growthLevelLabel(event.previousLevel as 1 | 2 | 3 | 4 | 5)}
        <span className="mx-2 text-amber-700">→</span>
        {growthLevelLabel(event.currentLevel as 1 | 2 | 3 | 4 | 5)}
      </p>

      <p className="relative mt-1 text-sm font-semibold text-gray-800">
        OVR {event.previousOvr}
        <span className="mx-1.5 text-gray-400">→</span>
        {event.currentOvr}
      </p>

      {badgeLabels.length > 0 ? (
        <div className="relative mt-3 rounded-lg border border-amber-200 bg-white/70 px-2.5 py-2">
          <p className="text-[11px] font-bold text-amber-950">새로운 배지</p>
          <ul className="mt-1 space-y-0.5 text-xs font-semibold text-amber-900">
            {badgeLabels.map((label) => (
              <li key={label}>{label} 획득</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="relative mt-3 text-sm leading-relaxed text-amber-900/90">
        꾸준한 훈련 결과 새로운 단계에 도달했습니다.
      </p>
    </div>
  );
}
