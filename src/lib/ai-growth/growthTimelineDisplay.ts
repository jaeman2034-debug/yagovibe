import type { GrowthTrendDirection, PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

/** D-4.2-b — Parent Home · Step5 공통 추세 라벨 */
export function formatGrowthTrendDeltaLabel(
  deltaScore: number | null,
  trendDirection: GrowthTrendDirection
): string {
  if (deltaScore == null) return "비교 데이터 없음";
  const signed = deltaScore > 0 ? `+${deltaScore}` : String(deltaScore);
  if (trendDirection === "up") return `${signed} (상승)`;
  if (trendDirection === "down") return `${signed} (하락)`;
  return `${signed} (안정적 유지)`;
}

export function formatGrowthTimelineScoreChain(scores: number[]): string {
  return scores.map((s) => String(s)).join(" → ");
}

/** sparkline SVG 좌표 (0–100 viewBox) */
export function buildSparklinePolylinePoints(
  scores: number[],
  width = 100,
  height = 24
): string | null {
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  return scores
    .map((score, index) => {
      const x = (index / (scores.length - 1)) * width;
      const y = height - ((score - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export function canShowGrowthTimelineChart(timeline: PlayerGrowthTimeline | null): boolean {
  return (timeline?.count ?? 0) >= 2;
}
