import type { GrowthScoreDimensionKey, GrowthScoreResult } from "@/lib/ai-growth/growthScore";

/** Sprint 8B-3 — 학부모·PDF용 5축 프로파일 (공격·수비·활동량·팀플레이·참여도) */

export const GROWTH_PROFILE_RADAR_AXES = [
  { key: "attack", labelKo: "공격", label: "Attack" },
  { key: "defense", labelKo: "수비", label: "Defense" },
  { key: "activity", labelKo: "활동량", label: "Activity" },
  { key: "teamPlay", labelKo: "팀플레이", label: "Team play" },
  { key: "participation", labelKo: "참여도", label: "Participation" },
] as const;

export type GrowthProfileRadarKey = (typeof GROWTH_PROFILE_RADAR_AXES)[number]["key"];

export type GrowthProfileRadarAxis = {
  key: GrowthProfileRadarKey;
  label: string;
  labelKo: string;
  score: number | null;
};

export type GrowthProfileRadarResult = {
  axes: GrowthProfileRadarAxis[];
  hasObservedData: boolean;
};

function dimensionScore(
  gs: GrowthScoreResult,
  key: GrowthScoreDimensionKey
): number | null {
  return gs.dimensions.find((d) => d.key === key)?.score ?? null;
}

/** 가중 평균 — 관찰된 축만 사용, 없으면 null */
function blendScores(
  pairs: Array<{ score: number | null; weight: number }>
): number | null {
  let sum = 0;
  let weight = 0;
  for (const { score, weight: w } of pairs) {
    if (score === null) continue;
    sum += score * w;
    weight += w;
  }
  if (weight === 0) return null;
  return Math.min(100, Math.round(sum / weight));
}

/**
 * 코치 검증 3축(SCAN·압박·회복) → 학부모용 5축 프로파일.
 * 이벤트 타입이 늘어나면 매핑만 확장하면 됩니다.
 */
export function computeGrowthProfileRadar(gs: GrowthScoreResult): GrowthProfileRadarResult {
  const scan = dimensionScore(gs, "SCAN");
  const press = dimensionScore(gs, "PRESS_RESIST");
  const recovery = dimensionScore(gs, "QUICK_RECOVERY");
  const overall = gs.snapshot.overall > 0 ? gs.snapshot.overall : null;

  const scores: Record<GrowthProfileRadarKey, number | null> = {
    attack: blendScores([
      { score: press, weight: 0.55 },
      { score: scan, weight: 0.25 },
      { score: overall, weight: 0.2 },
    ]),
    defense: blendScores([
      { score: recovery, weight: 0.45 },
      { score: press, weight: 0.35 },
      { score: scan, weight: 0.2 },
    ]),
    activity: blendScores([
      { score: recovery, weight: 0.6 },
      { score: press, weight: 0.2 },
      { score: overall, weight: 0.2 },
    ]),
    teamPlay: blendScores([
      { score: scan, weight: 0.65 },
      { score: press, weight: 0.25 },
      { score: overall, weight: 0.1 },
    ]),
    participation: blendScores([
      { score: scan, weight: 0.5 },
      { score: recovery, weight: 0.2 },
      { score: overall, weight: 0.3 },
    ]),
  };

  const axes: GrowthProfileRadarAxis[] = GROWTH_PROFILE_RADAR_AXES.map((meta) => ({
    key: meta.key,
    label: meta.label,
    labelKo: meta.labelKo,
    score: scores[meta.key],
  }));

  return {
    axes,
    hasObservedData: axes.some((a) => a.score !== null),
  };
}
