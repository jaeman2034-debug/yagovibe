/**
 * CV-1 I12-4 — Parent Hero Summary (I12-1~3 composite · read-only)
 */
import { useEffect } from "react";
import { Crown } from "lucide-react";
import { buildParentHeroSummaryView } from "@/lib/ai-growth/parentHeroSummaryView";
import { logJ0ParentCriticalPath } from "@/lib/ai-growth/j0ParentCriticalPathLog";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { cn } from "@/lib/utils";

type Props = {
  teamId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
  className?: string;
};

export function ParentHeroSummaryPanel({
  teamId,
  playerName,
  avatar,
  growthSummary,
  timeline,
  className,
}: Props) {
  const view = buildParentHeroSummaryView({
    playerName,
    avatar,
    growthSnapshot: growthSummary,
    timeline,
  });

  useEffect(() => {
    logJ0ParentCriticalPath(
      "hero_summary_render",
      view.isEmpty ? "empty" : "success",
      { teamId, playerId: avatar.playerId },
      { ovr: avatar.ovr, level: avatar.level }
    );
  }, [teamId, avatar.playerId, avatar.ovr, avatar.level, view.isEmpty]);

  if (view.isEmpty) {
    return (
      <section
        className={cn(
          "mt-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-3",
          className
        )}
        data-testid="i12-parent-summary-hero"
        aria-label="성장 요약"
      >
        <p className="text-xs font-bold text-amber-950">성장 요약</p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{view.emptyMessage}</p>
      </section>
    );
  }

  const deltaTone =
    view.recentDelta != null && view.recentDelta > 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : view.recentDelta != null && view.recentDelta < 0
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-violet-800 bg-violet-50 border-violet-200";

  return (
    <section
      className={cn(
        "mt-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-50/80 px-3 py-3 shadow-sm",
        className
      )}
      data-testid="i12-parent-summary-hero"
      aria-label="성장 요약"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-950">
        <Crown className="h-4 w-4 text-amber-600" aria-hidden />
        성장 요약
      </h3>

      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <div data-testid="i12-parent-summary-level">
          <p className="text-[10px] font-semibold text-amber-800">현재 상태</p>
          <p className="text-lg font-black text-gray-900">{view.levelLabel}</p>
          <p className="text-sm font-bold text-amber-900">
            {view.tierEmoji} {view.tierLabelKo}
          </p>
        </div>
        <div data-testid="i12-parent-summary-ovr">
          <p className="text-[10px] font-semibold text-amber-800">OVR</p>
          <p className="text-3xl font-black tabular-nums text-gray-900">{view.ovr}</p>
        </div>
        {view.recentDeltaLabel ? (
          <div data-testid="i12-parent-summary-delta">
            <p className="text-[10px] font-semibold text-amber-800">최근 변화</p>
            <p
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-lg font-black tabular-nums",
                deltaTone
              )}
            >
              {view.recentDeltaLabel}
            </p>
          </div>
        ) : null}
      </div>

      {view.representativeStrength ? (
        <p className="mt-2.5 text-sm font-semibold text-violet-950" data-testid="i12-parent-summary-strength">
          <span className="text-[10px] font-semibold text-violet-700">대표 강점 </span>
          {view.representativeStrength}
        </p>
      ) : null}

      <p className="mt-2 text-sm leading-relaxed text-gray-800">{view.statusSummary}</p>

      <p className="mt-2 text-[9px] text-amber-700/90">
        I12-1~3 projection · read-only · I12-4 Hero Summary
      </p>
    </section>
  );
}
