import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import type { GrowthLevelUpEvent } from "@/lib/ai-growth/growthAvatarLevelUp";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  event: GrowthLevelUpEvent;
  badgeLabels?: string[];
  onDismiss: () => void;
  className?: string;
};

/** J2-1a — Parent Home Level Up celebration modal */
export function LevelUpCelebrationModal({
  open,
  event,
  badgeLabels = [],
  onDismiss,
  className,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent
        className={cn(
          "max-w-md border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-0",
          className
        )}
        data-testid="parent-home-level-up-modal"
        aria-labelledby="level-up-celebration-title"
      >
        <div className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-orange-200/40 blur-xl" />

          <DialogHeader className="relative mb-0 text-center sm:text-center">
            <div className="flex items-center justify-center gap-2">
              <PartyPopper className="h-7 w-7 text-amber-600" aria-hidden />
              <DialogTitle
                id="level-up-celebration-title"
                className="text-xl font-black uppercase tracking-wide text-amber-950"
              >
                LEVEL UP!
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {event.playerName} 선수 레벨 상승 축하
            </DialogDescription>
          </DialogHeader>

          <p className="relative mt-4 text-center text-2xl font-black text-gray-900">
            {event.playerName}
          </p>

          <p className="relative mt-4 text-center text-lg font-bold text-amber-950">
            {growthLevelLabel(event.previousLevel as 1 | 2 | 3 | 4 | 5)}
            <span className="mx-2 text-amber-700">→</span>
            {growthLevelLabel(event.currentLevel as 1 | 2 | 3 | 4 | 5)}
          </p>

          <p className="relative mt-2 text-center text-base font-semibold text-gray-800">
            OVR {event.previousOvr}
            <span className="mx-1.5 text-gray-400">→</span>
            {event.currentOvr}
          </p>

          {badgeLabels.length > 0 ? (
            <div
              className="relative mt-4 rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5 text-center"
              data-testid="level-up-celebration-badges"
            >
              <p className="text-xs font-bold text-amber-950">새로운 배지</p>
              <ul className="mt-1 space-y-0.5 text-sm font-semibold text-amber-900">
                {badgeLabels.map((label) => (
                  <li key={label}>{label} 획득</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="relative mt-4 text-center text-sm leading-relaxed text-amber-900/90">
            꾸준한 훈련 결과 새로운 단계에 도달했습니다. 계속 성장하세요!
          </p>
        </div>

        <DialogFooter className="border-t border-amber-200/80 bg-white/60 px-6 py-4">
          <Button
            type="button"
            className="w-full bg-amber-600 font-bold hover:bg-amber-700"
            onClick={onDismiss}
            data-testid="level-up-celebration-dismiss"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
