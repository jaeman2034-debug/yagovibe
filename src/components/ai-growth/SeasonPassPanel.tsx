/**
 * J3-3 — Parent Home Season Pass (read-only projection)
 */
import { Trophy } from "lucide-react";
import { buildSeasonPassView } from "@/lib/ai-growth/seasonPassView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

export function SeasonPassPanel({ playerName, avatar, className }: Props) {
  const view = buildSeasonPassView(avatar);

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 px-3 py-3",
        className
      )}
      data-testid="j3-season-pass-panel"
      aria-label="시즌 패스"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-950">
        <Trophy className="h-4 w-4 text-amber-600" aria-hidden />
        Season Pass
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          {view.seasonLabel}
        </span>
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-amber-800">{playerName}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-lg border border-amber-100 bg-white/90 px-2.5 py-2"
          data-testid="j3-season-pass-level"
        >
          <p className="text-[10px] font-semibold text-amber-700">Season Level</p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-amber-950">
            {view.seasonLevel}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-amber-700">Season XP</p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-amber-950">
            {view.xpLabel}
          </p>
        </div>
      </div>

      <div className="mt-3" data-testid="j3-season-pass-progress">
        <p className="text-xs font-bold tabular-nums text-amber-950">
          Level Progress
          <span className="ml-2 text-amber-700">{view.levelProgress}%</span>
        </p>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
            style={{ width: `${view.levelProgress}%` }}
            role="progressbar"
            aria-label="레벨 진행률"
            aria-valuenow={view.levelProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <p className="mt-2 text-xs font-bold tabular-nums text-amber-950">
          Season Progress {view.seasonProgressLabel}
          <span className="ml-2 text-amber-700">{view.seasonProgress}%</span>
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-amber-100/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all"
            style={{ width: `${view.seasonProgress}%` }}
            role="progressbar"
            aria-label="시즌 진행률"
            aria-valuenow={view.seasonProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {view.nextReward ? (
        <div
          className="mt-3 rounded-lg border border-amber-200 bg-white/90 px-2.5 py-2"
          data-testid="j3-season-pass-next-reward"
        >
          <p className="text-[10px] font-semibold text-amber-700">다음 보상</p>
          <p className="mt-1 text-sm font-bold text-amber-950">
            <span className="mr-1" aria-hidden>{view.nextReward.emoji}</span>
            {view.nextReward.labelKo}
            <span className="mt-0.5 block text-xs font-medium text-amber-800">
              {view.nextReward.typeLabelKo} · Lv {view.nextReward.level}
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
