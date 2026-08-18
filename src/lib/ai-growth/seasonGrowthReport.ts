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
} from "@/lib/ai-growth/monthlyGrowthTimeline";
import type { GrowthScoreDimensionKey, GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import {
  buildSeasonWindow,
  filterSessionsForSeason,
  inferDefaultSeason,
  listSeasonsWithSessions,
  type SeasonWindow,
} from "@/lib/ai-growth/seasonWindow";
import { buildSeasonOvrImpact } from "@/lib/ai-growth/ovrEngine";
import type { PlayerGrowthOvrDoc } from "@/lib/ai-growth/playerGrowthOvrTypes";
import type { SeasonOvrImpact } from "@/lib/ai-growth/playerGrowthOvrTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";

export type SeasonKpi = {
  totalSessions: number;
  avgGrowthScore: number;
  maxScore: number;
  minScore: number;
  totalVerifiedEvents: number;
  approvalRatePct: number;
};

export type SeasonDimensionMvp = DimensionDeltaRank & {
  medal: string;
  rank: number;
};

export type SeasonGrowthGoal = {
  key: GrowthScoreDimensionKey;
  label: string;
  target: number;
};

export type SeasonGrowthReport = {
  playerName: string;
  teamName?: string;
  generatedAt: number;
  season: SeasonWindow;
  timeline: MonthlyGrowthTimeline;
  kpi: SeasonKpi;
  firstOverall: number | null;
  lastOverall: number | null;
  spanDelta: number | null;
  dimensionMvps: SeasonDimensionMvp[];
  coachSeasonReview: string[];
  nextSeasonGoals: SeasonGrowthGoal[];
  ovrImpact: SeasonOvrImpact | null;
  /** Sprint D-4.2-d — getPlayerGrowthTimeline() SoT (PDF export 시 주입) */
  recentSessionTimeline?: PlayerGrowthTimeline | null;
  /** Sprint D-5.3-c — PDF 주간 요약 블록 */
  weeklyGrowthDigest?: WeeklyGrowthDigestEnrichment | null;
  /** Sprint D-5.5-d — PDF AI 성장 요약 */
  aiGrowthSummary?: GrowthAiSummaryResult | null;
};

const MVP_MEDALS = ["🥇", "🥈", "🥉"] as const;

function computeKpi(sessions: PlayerGrowthSessionDoc[]): SeasonKpi {
  const scored = sessions.filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0);
  const overalls = scored.map((s) => s.metrics.growthScore!.overall);

  const avgGrowthScore =
    overalls.length > 0
      ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length)
      : 0;

  const approvalRatePct =
    scored.length > 0
      ? Math.round(
          (scored.reduce((s, x) => s + x.metrics.confirmedRatio, 0) / scored.length) * 100
        )
      : 0;

  return {
    totalSessions: scored.length,
    avgGrowthScore,
    maxScore: overalls.length > 0 ? Math.max(...overalls) : 0,
    minScore: overalls.length > 0 ? Math.min(...overalls) : 0,
    totalVerifiedEvents: sessions.reduce((s, x) => s + x.metrics.verifiedEventCount, 0),
    approvalRatePct,
  };
}

function buildDimensionMvps(byMonth: ReturnType<typeof lastSessionPerMonth>): SeasonDimensionMvp[] {
  return rankDimensionDeltas(byMonth)
    .slice(0, 3)
    .map((row, index) => ({
      ...row,
      medal: MVP_MEDALS[index] ?? "·",
      rank: index + 1,
    }));
}

function buildSeasonCoachReview(input: {
  playerName: string;
  season: SeasonWindow;
  timeline: MonthlyGrowthTimeline;
  mvps: SeasonDimensionMvp[];
  kpi: SeasonKpi;
  extraNotes: string[];
}): string[] {
  const name = input.playerName.trim() || "선수";
  const lines: string[] = [];

  if (input.timeline.hasEnoughData && input.timeline.spanDelta !== null) {
    const first = input.timeline.points[0]!;
    const last = input.timeline.points[input.timeline.points.length - 1]!;
    lines.push(
      `${name} 선수는 ${input.season.label} 동안 성장 점수가 ${first.overall}점에서 ${last.overall}점으로 변화했습니다.`
    );
    if (input.timeline.spanDelta > 0) {
      lines.push(
        `시즌 전반 대비 후반에 +${input.timeline.spanDelta}점 상승이 확인되어, 코치 검증 기준으로 꾸준한 성장 곡선을 보였습니다.`
      );
    }
  } else if (input.kpi.totalSessions > 0) {
    lines.push(
      `${input.season.label}에 코치 검증 세션 ${input.kpi.totalSessions}회가 기록되었습니다. 월별 저장이 늘수록 시즌 총평이 더 풍부해집니다.`
    );
  }

  const top = input.mvps[0];
  if (top) {
    lines.push(
      `특히 ${top.labelKo}(${top.label}) 영역에서 ${top.firstScore}점 → ${top.lastScore}점(+${top.delta}) 변화가 두드러졌습니다.`
    );
    lines.push(dimensionCoachPhrase(top.key));
    if (top.key === "SCAN") {
      lines.push(
        "공을 받기 전 주변 상황을 확인하는 행동이 반복적으로 관찰되었으며, 경기 이해도와 판단 속도 측면에서 긍정적인 신호가 확인되었습니다."
      );
    }
  }

  if (input.kpi.approvalRatePct >= 80) {
    lines.push(
      `코치 승인율 ${input.kpi.approvalRatePct}%로, AI 태깅 후 코치 검증 품질이 안정적으로 유지되었습니다.`
    );
  }

  for (const note of input.extraNotes) {
    if (note.trim()) lines.push(note.trim());
  }

  if (lines.length === 0) {
    lines.push(
      "시즌 리포트는 Step5에서 세션을 저장할수록 자동으로 채워집니다. 훈련·경기 영상마다 코치 검증을 이어 주세요."
    );
  }

  return lines;
}

function buildNextSeasonGoals(latest: GrowthScoreSnapshot | null): SeasonGrowthGoal[] {
  const targets: Record<GrowthScoreDimensionKey, number> = {
    SCAN: 95,
    PRESS_RESIST: 85,
    QUICK_RECOVERY: 85,
  };

  return GROWTH_DIMENSION_FIELDS.map((dim) => {
    const currentRaw = latest ? dim.pick(latest) : null;
    const current = typeof currentRaw === "number" ? currentRaw : null;
    const floor = targets[dim.key];
    const target =
      current === null
        ? floor
        : Math.min(100, Math.max(floor, current + (current >= 88 ? 4 : 8)));

    return { key: dim.key, label: dim.label, target };
  });
}

export function buildSeasonGrowthReport(input: {
  sessions: PlayerGrowthSessionDoc[];
  playerName: string;
  teamName?: string;
  season?: SeasonWindow;
  generatedAt?: number;
  coachNotes?: string[];
  currentOvrProfile?: PlayerGrowthOvrDoc | null;
}): SeasonGrowthReport {
  const season = input.season ?? inferDefaultSeason(input.generatedAt);
  const seasonSessions = filterSessionsForSeason(input.sessions, season);
  const timeline = buildMonthlyGrowthTimeline(seasonSessions);
  const byMonth = lastSessionPerMonth(seasonSessions);
  const dimensionMvps = buildDimensionMvps(byMonth);
  const kpi = computeKpi(seasonSessions);

  const firstOverall = timeline.points[0]?.overall ?? null;
  const lastOverall = timeline.points.at(-1)?.overall ?? null;
  const spanDelta =
    firstOverall !== null && lastOverall !== null ? lastOverall - firstOverall : null;

  const rankedDeltas = rankDimensionDeltas(byMonth);
  const ovrImpact = buildSeasonOvrImpact(input.currentOvrProfile ?? null, rankedDeltas);

  const sortedSessions = [...seasonSessions].sort((a, b) => b.generatedAt - a.generatedAt);
  const latestSession = sortedSessions.find(
    (s) => typeof s.metrics.growthScore?.overall === "number" && s.metrics.growthScore.overall > 0
  );
  const latestSnapshot = latestSession?.metrics.growthScore ?? null;

  return {
    playerName: input.playerName.trim() || "선수",
    teamName: input.teamName?.trim(),
    generatedAt: input.generatedAt ?? Date.now(),
    season,
    timeline,
    kpi,
    firstOverall,
    lastOverall,
    spanDelta,
    dimensionMvps,
    coachSeasonReview: buildSeasonCoachReview({
      playerName: input.playerName,
      season,
      timeline,
      mvps: dimensionMvps,
      kpi,
      extraNotes: input.coachNotes ?? [],
    }),
    nextSeasonGoals: buildNextSeasonGoals(latestSnapshot),
    ovrImpact,
  };
}

export function assertSeasonReportExportable(report: SeasonGrowthReport): void {
  const hasCurve = report.timeline.hasEnoughData && report.timeline.points.length >= 2;
  const hasSessions = report.kpi.totalSessions >= 2;

  if (!hasCurve && !hasSessions) {
    throw new Error(
      "시즌 PDF는 해당 시즌에 저장된 성장 세션이 2회 이상(또는 서로 다른 달 2개월) 필요합니다."
    );
  }
}

export { buildSeasonWindow, inferDefaultSeason, listSeasonsWithSessions, type SeasonWindow };
