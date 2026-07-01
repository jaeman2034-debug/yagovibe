/**
 * CV-1 I12-3 — Parent Timeline Surface (playerGrowthHistory read-only)
 */
import { useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { GrowthTimelineMiniChart } from "@/components/ai-growth/GrowthTimelineMiniChart";
import { buildParentGrowthTimelineView } from "@/lib/ai-growth/parentGrowthTimelineView";
import { logJ0ParentCriticalPath } from "@/lib/ai-growth/j0ParentCriticalPathLog";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { cn } from "@/lib/utils";

type Props = {
  teamId: string;
  timeline: PlayerGrowthTimeline | null;
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

export function ParentGrowthTimelinePanel({ teamId, timeline, avatar, className }: Props) {
  const view = buildParentGrowthTimelineView({ timeline, avatar });

  useEffect(() => {
    logJ0ParentCriticalPath(
      "timeline_render",
      view.canShowChart ? "success" : "empty",
      { teamId, playerId: avatar.playerId },
      { pointCount: timeline?.points?.length ?? 0 }
    );
  }, [teamId, avatar.playerId, view.canShowChart, timeline?.points?.length]);

  if (!view.canShowChart || !timeline) {
    return (
      <section
        className={cn(
          "mt-3 rounded-xl border border-dashed border-violet-200 bg-white/60 px-3 py-3",
          className
        )}
        data-testid="i12-parent-timeline"
        aria-label="최근 성장 추세"
      >
        <p className="text-xs font-bold text-violet-950">최근 성장 추세</p>
        <p className="mt-1.5 text-sm leading-relaxed text-violet-800">{view.emptyMessage}</p>
      </section>
    );
  }

  const trendTone =
    view.trendDirection === "up"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : view.trendDirection === "down"
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-violet-800 bg-violet-50 border-violet-200";

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/50 px-3 py-3",
        className
      )}
      data-testid="i12-parent-timeline"
      aria-label="최근 성장 추세"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-violet-950">
        <TrendingUp className="h-4 w-4 text-violet-600" aria-hidden />
        최근 성장 추세
      </h3>

      <p
        className="mt-2 text-sm font-bold tabular-nums text-violet-950"
        data-testid="i12-parent-timeline-ovr"
      >
        {view.ovrChain}
      </p>

      <div className="mt-2" data-testid="i12-parent-timeline-chart">
        <GrowthTimelineMiniChart timeline={timeline} variant="parent" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-sm text-violet-950" data-testid="i12-parent-timeline-level">
          <span className="text-[10px] font-semibold text-violet-700">레벨 </span>
          {view.levelLabel}
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-bold",
            trendTone
          )}
          data-testid="i12-parent-timeline-trend"
        >
          추세 {view.trendLabelKo}
        </span>
      </div>

      {view.badgeLines.length > 0 ? (
        <ul
          className="mt-2 space-y-1 text-sm text-violet-950"
          data-testid="i12-parent-timeline-badges"
        >
          {view.badgeLines.map((line) => (
            <li key={`${line.kind}-${line.labelKo}`} className="flex gap-1.5">
              <span className="text-violet-400" aria-hidden>
                ·
              </span>
              <span>
                {line.labelKo}{" "}
                <span className="text-violet-700">{line.kind === "acquired" ? "획득" : "유지"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-[9px] text-violet-600/90">
        playerGrowthHistory · read-only · I12-3 Timeline
      </p>
    </section>
  );
}
