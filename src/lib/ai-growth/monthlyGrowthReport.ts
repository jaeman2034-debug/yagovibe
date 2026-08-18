import type { GrowthScoreDimensionKey, GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import {
  dimensionCoachPhrase,
  GROWTH_DIMENSION_FIELDS,
  lastSessionPerMonth,
  rankDimensionDeltas,
  type DimensionDeltaRank,
} from "@/lib/ai-growth/growthReportDimensions";
import {
  buildMonthlyGrowthTimeline,
  type MonthlyGrowthTimeline,
  type MonthlyScorePoint,
} from "@/lib/ai-growth/monthlyGrowthTimeline";
import { canShowGrowthTimelineChart } from "@/lib/ai-growth/growthTimelineDisplay";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";

export type MonthlyDimensionPoint = {
  monthKey: string;
  label: string;
  score: number | null;
};

export type MonthlyDimensionTrend = DimensionDeltaRank;

export type MonthlyGrowthGoal = {
  key: GrowthScoreDimensionKey;
  label: string;
  current: number | null;
  target: number;
};

export type MonthlyGrowthReport = {
  playerName: string;
  teamName?: string;
  generatedAt: number;
  periodLabel: string;
  timeline: MonthlyGrowthTimeline;
  topDimension: MonthlyDimensionTrend | null;
  coachComments: string[];
  nextMonthGoals: MonthlyGrowthGoal[];
  totalSessions: number;
  totalVerifiedEvents: number;
  latestOverall: number | null;
  /** Sprint D-4.2-d — getPlayerGrowthTimeline() SoT (PDF·UI 공통) */
  recentSessionTimeline?: PlayerGrowthTimeline | null;
  /** Sprint D-5.3-c — PDF 주간 요약 블록 */
  weeklyGrowthDigest?: WeeklyGrowthDigestEnrichment | null;
  /** Sprint D-5.5-d — PDF AI 성장 요약 */
  aiGrowthSummary?: GrowthAiSummaryResult | null;
};

function pickTopDimensionTrend(byMonth: Map<string, PlayerGrowthSessionDoc>): MonthlyDimensionTrend | null {
  const ranked = rankDimensionDeltas(byMonth);
  return ranked[0] ?? null;
}

function buildCoachComments(input: {
  timeline: MonthlyGrowthTimeline;
  topDimension: MonthlyDimensionTrend | null;
  sessions: PlayerGrowthSessionDoc[];
  extraNotes: string[];
}): string[] {
  const lines: string[] = [];
  const monthCount = input.timeline.points.length;

  if (input.timeline.hasEnoughData && input.timeline.spanDelta !== null) {
    const first = input.timeline.points[0]!;
    const last = input.timeline.points[input.timeline.points.length - 1]!;
    const sign = input.timeline.spanDelta > 0 ? "+" : "";
    lines.push(
      `최근 ${monthCount}개월 동안 성장 점수가 ${first.overall}점에서 ${last.overall}점으로 변화했습니다 (${sign}${input.timeline.spanDelta}).`
    );
  }

  if (input.topDimension && input.topDimension.delta > 0) {
    lines.push(
      `${input.topDimension.labelKo}(${input.topDimension.label}) 항목이 ${input.topDimension.firstScore}점에서 ${input.topDimension.lastScore}점으로 개선되었습니다 (+${input.topDimension.delta}).`
    );
    lines.push(dimensionCoachPhrase(input.topDimension.key));
  } else if (input.topDimension) {
    lines.push(
      `가장 두드러진 관찰 축은 ${input.topDimension.labelKo}입니다. 코치 검증 장면을 이어가면 월간 변화가 더 선명해집니다.`
    );
  }

  const scanTotal = input.sessions.reduce((s, x) => s + x.metrics.scanCount, 0);
  if (scanTotal > 0) {
    lines.push(`주변 확인(SCAN) 코치 검증이 누적 ${scanTotal}건으로, 훈련·경기 영상에서 꾸준히 확인되고 있습니다.`);
  }

  for (const note of input.extraNotes) {
    if (note.trim()) lines.push(note.trim());
  }

  if (lines.length === 0) {
    lines.push(
      "저장된 코치 검증 세션이 쌓이면 월간 성장 코멘트가 자동으로 풍부해집니다. 세션마다 Step5 저장을 권장합니다."
    );
  }

  return lines;
}

function buildNextMonthGoals(latest: GrowthScoreSnapshot | null): MonthlyGrowthGoal[] {
  const defaults: Record<GrowthScoreDimensionKey, number> = {
    SCAN: 90,
    PRESS_RESIST: 75,
    QUICK_RECOVERY: 75,
  };

  return GROWTH_DIMENSION_FIELDS.map((dim) => {
    const currentRaw = latest ? dim.pick(latest) : null;
    const current = typeof currentRaw === "number" ? currentRaw : null;
    const floor = defaults[dim.key];
    const target =
      current === null
        ? floor
        : Math.min(100, Math.max(floor, current + (current >= 85 ? 3 : 7)));

    return {
      key: dim.key,
      label: dim.label,
      current,
      target,
    };
  });
}

function periodLabelFromPoints(points: MonthlyScorePoint[]): string {
  if (!points.length) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first.monthKey === last.monthKey) return last.label;
  return `${first.label} ~ ${last.label}`;
}

export function buildMonthlyGrowthReport(input: {
  sessions: PlayerGrowthSessionDoc[];
  playerName: string;
  teamName?: string;
  generatedAt?: number;
  coachNotes?: string[];
}): MonthlyGrowthReport {
  const timeline = buildMonthlyGrowthTimeline(input.sessions);
  const byMonth = lastSessionPerMonth(input.sessions);
  const topDimension = pickTopDimensionTrend(byMonth);

  const sortedSessions = [...input.sessions].sort((a, b) => b.generatedAt - a.generatedAt);
  const latestSession = sortedSessions.find(
    (s) => typeof s.metrics.growthScore?.overall === "number" && s.metrics.growthScore.overall > 0
  );
  const latestSnapshot = latestSession?.metrics.growthScore ?? null;

  const coachComments = buildCoachComments({
    timeline,
    topDimension,
    sessions: input.sessions,
    extraNotes: input.coachNotes ?? [],
  });

  return {
    playerName: input.playerName.trim() || "선수",
    teamName: input.teamName?.trim(),
    generatedAt: input.generatedAt ?? Date.now(),
    periodLabel: periodLabelFromPoints(timeline.points),
    timeline,
    topDimension,
    coachComments,
    nextMonthGoals: buildNextMonthGoals(latestSnapshot),
    totalSessions: input.sessions.filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0).length,
    totalVerifiedEvents: input.sessions.reduce((s, x) => s + x.metrics.verifiedEventCount, 0),
    latestOverall: latestSnapshot?.overall ?? timeline.points.at(-1)?.overall ?? null,
  };
}

export function canExportMonthlyComparisonPdf(report: MonthlyGrowthReport): boolean {
  return report.timeline.hasEnoughData && report.timeline.points.length >= 2;
}

/** D-4.2-d — 세션 타임라인(≥2) 또는 월간 비교(≥2달)이면 PDF export 허용 */
export function canExportGrowthReportPdf(report: MonthlyGrowthReport): boolean {
  return (
    canShowGrowthTimelineChart(report.recentSessionTimeline ?? null) ||
    canExportMonthlyComparisonPdf(report)
  );
}

export function assertMonthlyReportExportable(report: MonthlyGrowthReport): void {
  if (!canExportGrowthReportPdf(report)) {
    throw new Error(
      "성장 리포트 PDF는 코치 검증 훈련 기록 2회 이상 필요합니다. Step5에서 세션을 저장해 주세요."
    );
  }
}
