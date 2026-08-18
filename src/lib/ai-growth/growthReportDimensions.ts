import type { GrowthScoreDimensionKey, GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

export const GROWTH_DIMENSION_FIELDS: Array<{
  key: GrowthScoreDimensionKey;
  label: string;
  labelKo: string;
  pick: (g: GrowthScoreSnapshot) => number | null | undefined;
}> = [
  { key: "SCAN", label: "Vision (SCAN)", labelKo: "시야 확인", pick: (g) => g.visionScan },
  {
    key: "PRESS_RESIST",
    label: "Pressure Resistance",
    labelKo: "압박 대응",
    pick: (g) => g.pressureResistance,
  },
  {
    key: "QUICK_RECOVERY",
    label: "Recovery Speed",
    labelKo: "빠른 재집중",
    pick: (g) => g.recoverySpeed,
  },
];

export type DimensionMonthPoint = {
  monthKey: string;
  label: string;
  score: number | null;
};

export type DimensionDeltaRank = {
  key: GrowthScoreDimensionKey;
  label: string;
  labelKo: string;
  firstScore: number;
  lastScore: number;
  delta: number;
  series: DimensionMonthPoint[];
};

export function monthKeyFromMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabelFromKey(monthKey: string): string {
  const [, mm] = monthKey.split("-");
  const n = Number(mm);
  return Number.isFinite(n) ? `${n}월` : monthKey;
}

export function scoredSessions(sessions: PlayerGrowthSessionDoc[]): PlayerGrowthSessionDoc[] {
  return sessions.filter(
    (s) => typeof s.metrics.growthScore?.overall === "number" && s.metrics.growthScore.overall > 0
  );
}

export function lastSessionPerMonth(
  sessions: PlayerGrowthSessionDoc[]
): Map<string, PlayerGrowthSessionDoc> {
  const byMonth = new Map<string, PlayerGrowthSessionDoc>();
  for (const session of scoredSessions(sessions)) {
    const key = monthKeyFromMs(session.generatedAt);
    const existing = byMonth.get(key);
    if (!existing || session.generatedAt >= existing.generatedAt) {
      byMonth.set(key, session);
    }
  }
  return byMonth;
}

export function buildDimensionSeries(
  byMonth: Map<string, PlayerGrowthSessionDoc>,
  monthKeys: string[],
  pick: (g: GrowthScoreSnapshot) => number | null | undefined
): DimensionMonthPoint[] {
  return monthKeys.map((monthKey) => {
    const session = byMonth.get(monthKey);
    const raw = session?.metrics.growthScore ? pick(session.metrics.growthScore) : null;
    const score = typeof raw === "number" ? raw : null;
    return { monthKey, label: monthLabelFromKey(monthKey), score };
  });
}

export function rankDimensionDeltas(byMonth: Map<string, PlayerGrowthSessionDoc>): DimensionDeltaRank[] {
  const monthKeys = [...byMonth.keys()].sort();
  if (monthKeys.length < 2) return [];

  const ranked: DimensionDeltaRank[] = [];

  for (const dim of GROWTH_DIMENSION_FIELDS) {
    const series = buildDimensionSeries(byMonth, monthKeys, dim.pick);
    const observed = series.filter((p) => p.score !== null);
    if (observed.length < 2) continue;

    const first = observed[0]!;
    const last = observed[observed.length - 1]!;
    ranked.push({
      key: dim.key,
      label: dim.label,
      labelKo: dim.labelKo,
      firstScore: first.score!,
      lastScore: last.score!,
      delta: last.score! - first.score!,
      series,
    });
  }

  return ranked.sort((a, b) => b.delta - a.delta);
}

export function dimensionCoachPhrase(key: GrowthScoreDimensionKey): string {
  if (key === "SCAN") {
    return "패스 전 시야 확보가 경기 중 자연스럽게 나타나고 있습니다.";
  }
  if (key === "PRESS_RESIST") {
    return "압박 상황에서 볼 킵과 몸싸움이 안정적으로 관찰되었습니다.";
  }
  return "실수 후 빠른 재집중과 다음 플레이 연결이 개선되고 있습니다.";
}
