import type { GrowthConfidence, MockGrowthEvent } from "@/components/ai-growth/types";
import type { ReviewContextLike } from "@/components/ai-growth/growthReportTrust";
import {
  growthLetterGradeHint,
  scoreToGrowthLetterGrade,
  type GrowthLetterGrade,
} from "@/lib/ai-growth/growthLetterGrade";

export const GROWTH_SCORE_WEIGHTS = {
  SCAN: 0.4,
  PRESS_RESIST: 0.35,
  QUICK_RECOVERY: 0.25,
} as const;

export type GrowthScoreDimensionKey = keyof typeof GROWTH_SCORE_WEIGHTS;

export type GrowthScoreDimension = {
  key: GrowthScoreDimensionKey;
  label: string;
  labelKo: string;
  weight: number;
  score: number | null;
  eventCount: number;
};

export type GrowthScoreSnapshot = {
  overall: number;
  visionScan: number | null;
  pressureResistance: number | null;
  recoverySpeed: number | null;
  weights: typeof GROWTH_SCORE_WEIGHTS;
  observedEventCount: number;
};

export type GrowthScoreResult = {
  dimensions: GrowthScoreDimension[];
  snapshot: GrowthScoreSnapshot;
  parentLabel: string;
  parentHint: string;
};

export type GrowthScoreDelta = {
  previousOverall: number | null;
  previousSessionAt: number | null;
  delta: number | null;
  narrative: string | null;
};

type VerifiedItem = { event: MockGrowthEvent; context: ReviewContextLike };

const DIMENSION_META: Record<
  GrowthScoreDimensionKey,
  { label: string; labelKo: string }
> = {
  SCAN: { label: "Vision (SCAN)", labelKo: "시야 확인" },
  PRESS_RESIST: { label: "Pressure Resistance", labelKo: "압박 대응" },
  QUICK_RECOVERY: { label: "Recovery Speed", labelKo: "빠른 재집중" },
};

function confidenceBase(confidence: GrowthConfidence): number {
  if (confidence === "HIGH") return 88;
  if (confidence === "MEDIUM") return 74;
  return 60;
}

/** 단일 축: 검증 이벤트 수 + AI confidence → 0~100 (미관찰 시 null) */
export function computeDimensionScore(
  items: VerifiedItem[],
  eventType: GrowthScoreDimensionKey
): { score: number | null; eventCount: number } {
  const matched = items.filter((i) => i.event.eventType === eventType);
  if (matched.length === 0) {
    return { score: null, eventCount: 0 };
  }

  let total = 0;
  for (const { event } of matched) {
    const base = confidenceBase(event.confidence);
    const repeatBonus = Math.min(8, matched.length > 1 ? 4 : 0);
    total += Math.min(100, base + repeatBonus);
  }
  const avg = total / matched.length;
  const volumeBonus = Math.min(12, (matched.length - 1) * 4);
  return {
    score: Math.min(100, Math.round(avg + volumeBonus)),
    eventCount: matched.length,
  };
}

export function computeGrowthScore(verifiedItems: VerifiedItem[]): GrowthScoreResult {
  const dimensions: GrowthScoreDimension[] = (
    Object.keys(GROWTH_SCORE_WEIGHTS) as GrowthScoreDimensionKey[]
  ).map((key) => {
    const { score, eventCount } = computeDimensionScore(verifiedItems, key);
    const meta = DIMENSION_META[key];
    return {
      key,
      label: meta.label,
      labelKo: meta.labelKo,
      weight: GROWTH_SCORE_WEIGHTS[key],
      score,
      eventCount,
    };
  });

  const active = dimensions.filter((d) => d.score !== null);
  const totalWeight = active.reduce((sum, d) => sum + d.weight, 0);
  let overall = 0;

  if (active.length === 0) {
    overall = 0;
  } else {
    const weighted = active.reduce(
      (sum, d) => sum + (d.score ?? 0) * (d.weight / totalWeight),
      0
    );
    overall = Math.round(weighted);
  }

  const snapshot: GrowthScoreSnapshot = {
    overall,
    visionScan: dimensions.find((d) => d.key === "SCAN")?.score ?? null,
    pressureResistance: dimensions.find((d) => d.key === "PRESS_RESIST")?.score ?? null,
    recoverySpeed: dimensions.find((d) => d.key === "QUICK_RECOVERY")?.score ?? null,
    weights: GROWTH_SCORE_WEIGHTS,
    observedEventCount: verifiedItems.length,
  };

  const { label, hint } = parentScoreBand(overall);

  return {
    dimensions,
    snapshot,
    parentLabel: label,
    parentHint: hint,
  };
}

/** PDF·UI — 학부모용 (— 대신 명확한 문구) */
export function formatDimensionScoreDisplay(score: number | null): string {
  if (score !== null) return String(score);
  return "관찰 데이터 없음";
}

/** 이번 세션에서 점수가 있는 축 중 상위 1~2개 (주요 강점) */
export function pickPrimaryStrengths(dimensions: GrowthScoreDimension[]): string[] {
  const observed = dimensions.filter((d) => d.score !== null);
  if (!observed.length) return [];
  return [...observed]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)
    .map((d) => d.labelKo);
}

/** Sprint 8B-2 — 종합 점수 → A+/A/A-/B+/B 배지 라벨 */
export function parentScoreBand(overall: number): {
  label: string;
  hint: string;
  letterGrade: GrowthLetterGrade | null;
} {
  const letterGrade = scoreToGrowthLetterGrade(overall);
  if (letterGrade) {
    return {
      label: letterGrade,
      letterGrade,
      hint: `${overall}점 · ${growthLetterGradeHint(letterGrade)}`,
    };
  }
  if (overall > 0) {
    return {
      label: "B",
      letterGrade: "B",
      hint: `${overall}점 · 코치 검증 이벤트가 늘수록 점수가 안정됩니다.`,
    };
  }
  return {
    label: "검증 대기",
    letterGrade: null,
    hint: "Step4에서 이벤트를 승인하면 Growth Score가 계산됩니다.",
  };
}

function normVideoId(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export type GrowthComparisonBaselineDebug = {
  historyCount: number;
  scoredCount: number;
  currentVideoId: string | null;
  newestSavedVideoId: string | null;
  baselineCount: number;
  baselineOverall: number | null;
  strategy: "empty" | "single-other-video" | "skip-newest-same-video" | "global-newest";
};

/** 직전 비교 baseline — 최신 저장이 현재 영상과 같으면 그다음 세션을 직전 훈련으로 사용 */
export function buildComparisonBaselineFromSessions(
  sessions: Array<{
    generatedAt: number;
    videoId?: string | null;
    metrics: { growthScore?: GrowthScoreSnapshot };
  }>,
  currentVideoId: string | null
): Array<{ overall: number; generatedAt: number }> {
  const pool = extractScoreHistoryFromSessions(sessions);
  if (pool.length === 0) return [];

  const sorted = [...pool].sort((a, b) => b.generatedAt - a.generatedAt);
  const scoredSessions = [...sessions]
    .filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0)
    .sort((a, b) => b.generatedAt - a.generatedAt);
  const newestSaved = scoredSessions[0];
  const currentVid = normVideoId(currentVideoId);
  const newestVid = normVideoId(newestSaved?.videoId);

  if (pool.length === 1) {
    if (currentVid && newestVid === currentVid) {
      return [];
    }
    return sorted;
  }

  if (currentVid && newestVid === currentVid && sorted.length >= 2) {
    return sorted.slice(1);
  }

  return sorted;
}

export function debugGrowthComparisonBaseline(
  sessions: Array<{
    generatedAt: number;
    videoId?: string | null;
    metrics: { growthScore?: GrowthScoreSnapshot };
  }>,
  currentVideoId: string | null
): GrowthComparisonBaselineDebug {
  const pool = extractScoreHistoryFromSessions(sessions);
  const baseline = buildComparisonBaselineFromSessions(sessions, currentVideoId);
  const scoredSessions = [...sessions]
    .filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0)
    .sort((a, b) => b.generatedAt - a.generatedAt);
  const newestSaved = scoredSessions[0];

  let strategy: GrowthComparisonBaselineDebug["strategy"] = "empty";
  if (baseline.length === 0) {
    strategy = "empty";
  } else if (pool.length === 1) {
    strategy = "single-other-video";
  } else if (
    normVideoId(currentVideoId) &&
    normVideoId(newestSaved?.videoId) === normVideoId(currentVideoId) &&
    pool.length >= 2
  ) {
    strategy = "skip-newest-same-video";
  } else {
    strategy = "global-newest";
  }

  return {
    historyCount: sessions.length,
    scoredCount: pool.length,
    currentVideoId,
    newestSavedVideoId: newestSaved?.videoId ?? null,
    baselineCount: baseline.length,
    baselineOverall: baseline[0]?.overall ?? null,
    strategy,
  };
}

export function compareGrowthScoreToHistory(
  currentOverall: number,
  previousSnapshots: Array<{ overall: number; generatedAt: number }>
): GrowthScoreDelta {
  if (previousSnapshots.length === 0 || currentOverall <= 0) {
    return {
      previousOverall: null,
      previousSessionAt: null,
      delta: null,
      narrative: null,
    };
  }

  const sorted = [...previousSnapshots].sort((a, b) => b.generatedAt - a.generatedAt);
  const prev = sorted[0]!;
  const delta = currentOverall - prev.overall;
  const sign = delta > 0 ? "+" : "";
  const narrative =
    delta === 0
      ? `이전 세션(${formatMonthDay(prev.generatedAt)})과 동일한 ${currentOverall}점입니다.`
      : `이전 세션 ${prev.overall}점 → 이번 ${currentOverall}점 (${sign}${delta}점)`;

  return {
    previousOverall: prev.overall,
    previousSessionAt: prev.generatedAt,
    delta,
    narrative,
  };
}

function formatMonthDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function extractScoreHistoryFromSessions(
  sessions: Array<{ generatedAt: number; metrics: { growthScore?: GrowthScoreSnapshot } }>
): Array<{ overall: number; generatedAt: number }> {
  return sessions
    .filter((s) => typeof s.metrics.growthScore?.overall === "number" && s.metrics.growthScore.overall > 0)
    .map((s) => ({
      overall: s.metrics.growthScore!.overall,
      generatedAt: s.generatedAt,
    }));
}
