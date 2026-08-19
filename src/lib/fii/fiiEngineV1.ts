/**
 * FII Engine v1 — Core 3축(SCAN·압박·회복) → FII 5축 환산
 * @see docs/FII_ENGINE_V1.md
 */
import type { GrowthScoreDimensionKey, GrowthScoreResult } from "@/lib/ai-growth/growthScore";

export const FII_ENGINE_VERSION = "v1.0.0";

export const FII_V1_AXES = [
  { key: "spatial", labelKo: "공간 인식", weight: 0.22 },
  { key: "vision", labelKo: "시야", weight: 0.2 },
  { key: "decision", labelKo: "의사결정", weight: 0.2 },
  { key: "pressure", labelKo: "압박 대응", weight: 0.2 },
  { key: "tactics", labelKo: "전술 이해도", weight: 0.18 },
] as const;

export type FiiV1AxisKey = (typeof FII_V1_AXES)[number]["key"];

export type FiiV1AxisScore = {
  key: FiiV1AxisKey;
  labelKo: string;
  score: number | null;
  weight: number;
  /** 환산에 사용된 Core 3축 기여 설명 */
  rationale: string;
};

export type FiiV1Result = {
  version: string;
  overall: number;
  axes: FiiV1AxisScore[];
  coreInputs: {
    scan: number | null;
    press: number | null;
    recovery: number | null;
  };
  overallFormula: string;
};

function coreScore(
  gs: GrowthScoreResult,
  key: GrowthScoreDimensionKey
): number | null {
  return gs.dimensions.find((d) => d.key === key)?.score ?? null;
}

function blend(
  pairs: Array<{ score: number | null; weight: number }>
): number | null {
  let sum = 0;
  let w = 0;
  for (const p of pairs) {
    if (p.score === null) continue;
    sum += p.score * p.weight;
    w += p.weight;
  }
  if (w === 0) return null;
  return Math.min(100, Math.round(sum / w));
}

/**
 * Core 3축 점수 → FII 5축 (문서화된 v1 환산식)
 */
export function computeFiiV1FromGrowthScore(gs: GrowthScoreResult): FiiV1Result {
  const scan = coreScore(gs, "SCAN");
  const press = coreScore(gs, "PRESS_RESIST");
  const recovery = coreScore(gs, "QUICK_RECOVERY");

  const spatial = blend([
    { score: scan, weight: 0.55 },
    { score: press, weight: 0.25 },
    { score: recovery, weight: 0.2 },
  ]);
  const vision = blend([
    { score: scan, weight: 0.75 },
    { score: recovery, weight: 0.25 },
  ]);
  const decision = blend([
    { score: scan, weight: 0.35 },
    { score: press, weight: 0.35 },
    { score: recovery, weight: 0.3 },
  ]);
  const pressure = press;
  const tactics = blend([
    { score: recovery, weight: 0.5 },
    { score: scan, weight: 0.3 },
    { score: press, weight: 0.2 },
  ]);

  const axisScores: Array<{ key: FiiV1AxisKey; score: number | null; rationale: string }> = [
    {
      key: "spatial",
      score: spatial,
      rationale: "SCAN 55% + 압박 25% + 회복 20%",
    },
    {
      key: "vision",
      score: vision,
      rationale: "SCAN 75% + 회복 25%",
    },
    {
      key: "decision",
      score: decision,
      rationale: "SCAN·압박·회복 균형 35:35:30",
    },
    {
      key: "pressure",
      score: pressure,
      rationale: "압박 대응(PRESS_RESIST) 직접 반영",
    },
    {
      key: "tactics",
      score: tactics,
      rationale: "회복 50% + SCAN 30% + 압박 20%",
    },
  ];

  const axes: FiiV1AxisScore[] = FII_V1_AXES.map((meta) => {
    const row = axisScores.find((a) => a.key === meta.key)!;
    return {
      key: meta.key,
      labelKo: meta.labelKo,
      score: row.score,
      weight: meta.weight,
      rationale: row.rationale,
    };
  });

  const active = axes.filter((a) => a.score !== null);
  let overall = gs.snapshot.overall;
  if (active.length > 0) {
    const tw = active.reduce((s, a) => s + a.weight, 0);
    overall = Math.round(
      active.reduce((s, a) => s + (a.score ?? 0) * (a.weight / tw), 0)
    );
  }

  return {
    version: FII_ENGINE_VERSION,
    overall,
    axes,
    coreInputs: { scan, press, recovery },
    overallFormula:
      "FII 종합 = 5축 가중평균(공간22%·시야20%·의사20%·압박20%·전술18%), Core 3축은 코치 검증 GEV 이벤트에서 산출",
  };
}

export function fiiV1GradeLabel(score: number | null): string {
  if (score === null) return "미관찰";
  if (score >= 78) return "우수";
  if (score >= 70) return "보통";
  return "개선 권장";
}
