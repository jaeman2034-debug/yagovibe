/**
 * J3-2 — Parent Home Avatar XP (read-only projection)
 */
import { Sparkles } from "lucide-react";
import { buildAvatarXpSystemView } from "@/lib/ai-growth/avatarXpSystemView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

export function AvatarXpSystemPanel({ playerName, avatar, className }: Props) {
  const view = buildAvatarXpSystemView(avatar);

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 px-3 py-3",
        className
      )}
      data-testid="j3-avatar-xp-panel"
      aria-label="아바타 XP"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-violet-950">
        <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
        Avatar XP
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-violet-800">{playerName}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-violet-100 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-violet-700">Level</p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-violet-950">{view.level}</p>
        </div>
        <div
          className="rounded-lg border border-violet-100 bg-white/90 px-2.5 py-2"
          data-testid="j3-avatar-xp-current"
        >
          <p className="text-[10px] font-semibold text-violet-700">현재 XP</p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-violet-950">
            {view.currentXp}
          </p>
        </div>
      </div>

      <div className="mt-3" data-testid="j3-avatar-xp-progress">
        <p className="text-xs font-bold tabular-nums text-violet-950">
          {view.xpLabel}
          {view.nextLevelXp != null ? (
            <span className="ml-2 text-violet-700">{view.progress}%</span>
          ) : null}
        </p>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${view.progress}%` }}
            role="progressbar"
            aria-valuenow={view.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <p
        className="mt-3 text-sm font-bold text-violet-950"
        data-testid="j3-avatar-xp-next-level"
      >
        {view.levelUpLabel}
        {view.nextLevelXp != null ? (
          <span className="mt-0.5 block text-xs font-medium text-violet-800">
            다음 레벨까지 {view.nextLevelXp - view.currentXp} XP
          </span>
        ) : null}
      </p>
    </section>
  );
}
