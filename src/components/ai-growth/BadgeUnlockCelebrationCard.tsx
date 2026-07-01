import { X } from "lucide-react";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import type { GrowthBadgeUnlockEvent } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import { cn } from "@/lib/utils";

type Props = {
  event: GrowthBadgeUnlockEvent;
  className?: string;
  onDismiss?: () => void;
};

/** Sprint D-4.3 — Step5 배지 해제 축하 카드 */
export function BadgeUnlockCelebrationCard({ event, className, onDismiss }: Props) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-4 shadow-sm",
        className
      )}
      data-testid="badge-unlock-celebration-card"
      aria-label="배지 획득"
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-amber-800 hover:bg-amber-100"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">New Badge</p>
      <h3 className="mt-1 text-lg font-black text-amber-950">
        🎉 {event.playerName}님, 새 배지를 획득했어요!
      </h3>
      <GrowthBadgeChips className="mt-3" badgeIds={event.badgeIds} size="md" />
    </section>
  );
}
