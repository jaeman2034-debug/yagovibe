import { GROWTH_DIMENSION_FIELDS } from "@/lib/ai-growth/growthReportDimensions";
import type { GrowthScoreDelta, GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

/** 학부모 노출용 축 이름 (짧게) */
export const PARENT_DIMENSION_LABEL: Record<
  (typeof GROWTH_DIMENSION_FIELDS)[number]["key"],
  string
> = {
  SCAN: "시야",
  PRESS_RESIST: "압박 대응",
  QUICK_RECOVERY: "재집중",
};

export type DimensionComparisonRow = {
  key: (typeof GROWTH_DIMENSION_FIELDS)[number]["key"];
  labelKo: string;
  previous: number | null;
  current: number | null;
  delta: number | null;
};

export function formatGrowthSessionDateLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function findSessionByGeneratedAt(
  sessions: PlayerGrowthSessionDoc[],
  generatedAt: number | null
): PlayerGrowthSessionDoc | null {
  if (generatedAt == null) return null;
  const exact = sessions.find((s) => s.generatedAt === generatedAt);
  if (exact) return exact;
  const sorted = [...sessions].sort((a, b) => b.generatedAt - a.generatedAt);
  return sorted.find((s) => s.generatedAt <= generatedAt) ?? null;
}

export function buildDimensionComparisonRows(
  current: GrowthScoreSnapshot,
  previous: GrowthScoreSnapshot | null | undefined
): DimensionComparisonRow[] {
  if (!previous) return [];

  return GROWTH_DIMENSION_FIELDS.map((dim) => {
    const cur = dim.pick(current);
    const prev = dim.pick(previous);
    const currentScore = typeof cur === "number" ? cur : null;
    const previousScore = typeof prev === "number" ? prev : null;
    const delta =
      currentScore !== null && previousScore !== null ? currentScore - previousScore : null;
    return {
      key: dim.key,
      labelKo: PARENT_DIMENSION_LABEL[dim.key],
      previous: previousScore,
      current: currentScore,
      delta,
    };
  }).filter((row) => row.current !== null || row.previous !== null);
}

export function pickTopDimensionImprovement(rows: DimensionComparisonRow[]): DimensionComparisonRow | null {
  const improved = rows.filter((r) => r.delta !== null && r.delta > 0);
  if (improved.length === 0) return null;
  return improved.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0] ?? null;
}

export function buildParentComparisonSummary(
  delta: GrowthScoreDelta | null,
  dimensionRows: DimensionComparisonRow[]
): string | null {
  if (delta?.delta === null || delta.delta === undefined) return null;
  if (delta.delta === 0) {
    return "지난 훈련과 같은 점수예요.\n꾸준히 성장 흐름을 유지하고 있습니다.";
  }
  if (delta.delta > 0 && delta.delta <= 4) {
    return `지난 훈련보다 ${delta.delta}점 향상됐어요. 꾸준히 성장하고 있어요.`;
  }
  if (delta.delta >= 5 && delta.delta <= 9) {
    return `지난 훈련보다 ${delta.delta}점 향상됐어요. 눈에 띄는 성장입니다.`;
  }
  if (delta.delta >= 10) {
    return `지난 훈련보다 ${delta.delta}점 향상됐어요. 훌륭한 성장세입니다.`;
  }
  const top = pickTopDimensionImprovement(dimensionRows);
  const sign = delta.delta > 0 ? "올랐" : "변화했";
  if (top && top.delta && top.delta > 0) {
    return `지난 훈련보다 ${Math.abs(delta.delta)}점 ${sign}어요. ${top.labelKo} 항목이 특히 좋아졌어요.`;
  }
  return `지난 훈련보다 ${Math.abs(delta.delta)}점 ${sign}어요.`;
}
