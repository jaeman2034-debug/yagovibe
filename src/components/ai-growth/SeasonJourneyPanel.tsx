/**
 * J2-2 — Parent Home Season Journey (read-only)
 */
import { Map as MapIcon } from "lucide-react";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import { buildSeasonJourneyView } from "@/lib/ai-growth/seasonJourneyView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { buildSparklinePolylinePoints } from "@/lib/ai-growth/growthTimelineDisplay";
import { cn } from "@/lib/utils";

type Props = {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  className?: string;
};

export function SeasonJourneyPanel({ playerName, avatar, timeline, className }: Props) {
  const view = buildSeasonJourneyView({ avatar, timeline });
  const sparkline = view.canShowChart
    ? buildSparklinePolylinePoints(view.scoreChain)
    : null;

  const deltaTone =
    view.delta30d != null && view.delta30d > 0
      ? "text-emerald-700"
      : view.delta30d != null && view.delta30d < 0
        ? "text-amber-700"
        : "text-violet-900";

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 px-3 py-3",
        className
      )}
      data-testid="j2-season-journey-panel"
      aria-label="시즌 여정"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-indigo-950">
        <MapIcon className="h-4 w-4 text-indigo-600" aria-hidden />
        {playerName} 시즌 여정
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-indigo-700">현재 OVR</p>
          <p
            className="mt-0.5 text-xl font-black tabular-nums text-indigo-950"
            data-testid="j2-season-journey-current-ovr"
          >
            {view.currentOvr}
          </p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-indigo-700">시즌 최고</p>
          <p
            className="mt-0.5 text-xl font-black tabular-nums text-indigo-950"
            data-testid="j2-season-journey-best-ovr"
          >
            {view.bestOvr}
          </p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-indigo-700">최근 30일</p>
          <p
            className={cn("mt-0.5 text-xl font-black tabular-nums", deltaTone)}
            data-testid="j2-season-journey-delta-30d"
          >
            {view.delta30dLabel}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold text-indigo-700">최근 10회 성장</p>
        <p
          className="mt-1 text-sm font-bold tabular-nums text-indigo-950"
          data-testid="j2-season-journey-score-chain"
        >
          {view.scoreChainLabel}
        </p>
      </div>

      <div className="mt-3" data-testid="j2-season-journey-chart">
        <p className="text-[10px] font-semibold text-indigo-700">성장 곡선</p>
        {sparkline ? (
          <svg
            viewBox="0 0 100 24"
            className="mt-2 h-8 w-full text-indigo-600"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={sparkline}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-indigo-800">
            {view.emptyChartMessage}
          </p>
        )}
      </div>

      <div className="mt-3" data-testid="j2-season-journey-badges">
        <p className="text-[10px] font-semibold text-indigo-700">획득 배지</p>
        {view.badgeCount > 0 ? (
          <GrowthBadgeChips className="mt-1.5" badgeIds={avatar.badges} size="sm" />
        ) : (
          <p className="mt-1.5 text-sm text-indigo-800">아직 획득한 배지가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
