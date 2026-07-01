import { cn } from "@/lib/utils";
import {
  buildSparklinePolylinePoints,
  formatGrowthTimelineScoreChain,
  formatGrowthTrendDeltaLabel,
} from "@/lib/ai-growth/growthTimelineDisplay";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

type Props = {
  timeline: PlayerGrowthTimeline;
  className?: string;
  variant?: "parent" | "compact";
};

/** Sprint D-4.2-b — 최근 5회 OVR 미니 차트 + 점수 체인 */
export function GrowthTimelineMiniChart({ timeline, className, variant = "parent" }: Props) {
  const scores = timeline.points.map((p) => p.score);
  const sparkline = buildSparklinePolylinePoints(scores);
  const deltaLabel = formatGrowthTrendDeltaLabel(timeline.deltaScore, timeline.trendDirection);
  const scoreChain = formatGrowthTimelineScoreChain(scores);

  const trendColor =
    timeline.trendDirection === "up"
      ? "text-emerald-700"
      : timeline.trendDirection === "down"
        ? "text-amber-700"
        : "text-violet-800";

  return (
    <div
      className={cn(
        "rounded-xl border border-violet-200/80 bg-white/70 px-3 py-2.5",
        className
      )}
      data-testid="growth-timeline-mini-chart"
    >
      <p className="text-xs font-semibold text-violet-800">최근 성장 추세</p>

      {sparkline ? (
        <svg
          viewBox="0 0 100 24"
          className="mt-2 h-6 w-full text-violet-600"
          preserveAspectRatio="none"
          aria-hidden
          data-testid="growth-timeline-sparkline"
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
      ) : null}

      <p
        className={cn(
          "mt-2 text-sm font-medium text-gray-800 tabular-nums",
          variant === "compact" && "text-xs"
        )}
        data-testid="growth-timeline-score-chain"
      >
        {scoreChain}
      </p>

      <p className="mt-1 text-xs text-gray-600">
        변화{" "}
        <strong className={cn("tabular-nums", trendColor)} data-testid="growth-timeline-delta">
          {deltaLabel}
        </strong>
      </p>
    </div>
  );
}
