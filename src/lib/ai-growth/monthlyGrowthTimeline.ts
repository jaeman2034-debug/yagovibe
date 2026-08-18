import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

export type MonthlyScorePoint = {
  monthKey: string;
  label: string;
  overall: number;
  sessionCount: number;
  latestAt: number;
};

export type MonthlyGrowthTimeline = {
  points: MonthlyScorePoint[];
  spanDelta: number | null;
  parentNarrative: string | null;
  hasEnoughData: boolean;
};

function monthKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabelFromKey(monthKey: string): string {
  const [, mm] = monthKey.split("-");
  const n = Number(mm);
  return Number.isFinite(n) ? `${n}월` : monthKey;
}

/**
 * 월별 Growth Score — 각 달의 마지막 저장 세션 점수를 대표값으로 사용.
 */
export function buildMonthlyGrowthTimeline(
  sessions: PlayerGrowthSessionDoc[]
): MonthlyGrowthTimeline {
  const scored = sessions.filter(
    (s) => typeof s.metrics.growthScore?.overall === "number" && s.metrics.growthScore.overall > 0
  );

  const byMonth = new Map<string, MonthlyScorePoint>();

  for (const session of scored) {
    const key = monthKeyFromMs(session.generatedAt);
    const overall = session.metrics.growthScore!.overall;
    const existing = byMonth.get(key);
    if (!existing) {
      byMonth.set(key, {
        monthKey: key,
        label: monthLabelFromKey(key),
        overall,
        sessionCount: 1,
        latestAt: session.generatedAt,
      });
      continue;
    }
    existing.sessionCount += 1;
    if (session.generatedAt >= existing.latestAt) {
      existing.overall = overall;
      existing.latestAt = session.generatedAt;
    }
  }

  const points = [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  if (points.length < 2) {
    return {
      points,
      spanDelta: null,
      parentNarrative:
        points.length === 1
          ? `${points[0]!.label} ${points[0]!.overall}점이 기록되었습니다. 다음 달 세션을 저장하면 월간 성장 비교가 표시됩니다.`
          : null,
      hasEnoughData: false,
    };
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const spanDelta = last.overall - first.overall;
  const sign = spanDelta > 0 ? "+" : "";
  const chain = points.map((p) => `${p.label} ${p.overall}점`).join(" → ");

  return {
    points,
    spanDelta,
    parentNarrative: `${chain} · ${sign}${spanDelta} 성장`,
    hasEnoughData: true,
  };
}

export function formatMonthlyTimelineLine(points: MonthlyScorePoint[]): string {
  return points.map((p) => `${p.label} ${p.overall}점`).join("  ·  ");
}
