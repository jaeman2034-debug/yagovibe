/**
 * Sprint D-1.1b — Weekly digest summary generator (pure · client + gate)
 * CF mirror: functions/src/lib/growthWeeklyDigest.ts
 */
import { seoulCalendarFromInstant } from "@/features/fees/utils/seoulFeeDue";

import type { WeeklyDigestSummary } from "@/lib/ai-growth/weeklyDigestTypes";

export const WEEKLY_DIGEST_SCHEMA_VERSION = 1 as const;

export type { WeeklyDigestSummary };

export type GrowthScoreDimensionKey = "SCAN" | "PRESS_RESIST" | "QUICK_RECOVERY";

export type GrowthScoreSnapshotLike = {
  overall: number;
  visionScan?: number | null;
  pressureResistance?: number | null;
  recoverySpeed?: number | null;
};

export type WeeklyDigestSessionInput = {
  sessionId: string;
  playerId: string;
  playerName: string;
  generatedAt: number;
  metrics: {
    growthScore?: GrowthScoreSnapshotLike;
  };
  delivery?: {
    pdfDownloadUrl?: string;
    sharePath?: string;
  };
};

export type WeeklyDigestDocPayload = {
  schemaVersion: typeof WEEKLY_DIGEST_SCHEMA_VERSION;
  playerId: string;
  playerName: string;
  weekKey: string;
  weekStartMs: number;
  weekEndMs: number;
  summary: WeeklyDigestSummary;
  latestSessionId: string;
  latestSharePath: string | null;
  sessionCount: number;
  createdAt: number;
};

const PARENT_DIMENSION_LABEL: Record<GrowthScoreDimensionKey, string> = {
  SCAN: "시야",
  PRESS_RESIST: "압박 대응",
  QUICK_RECOVERY: "재집중",
};

const COACH_DRILL_BY_DIMENSION: Record<GrowthScoreDimensionKey, string> = {
  SCAN: "360° 시야 스캔 드릴",
  PRESS_RESIST: "3v2 압박 탈출 훈련",
  QUICK_RECOVERY: "2v1 의사결정 연속 플레이",
};

const PARENT_TRAINING_TITLE_MAP: Record<string, string> = {
  "2v1 의사결정 연속 플레이": "두 명이 한 명의 수비를 뚫는 연습",
  "4v4 공간 창출 미니게임": "빈 공간을 찾아 움직이는 연습 게임",
  "전환 후 5초 내 재공격": "전환 후 5초 재압박 훈련",
  "3존 패스·이동 공간 인식": "구역별로 패스하며 자리 찾기 연습",
  "헤드업 패스 서클": "고개를 들고 패스하는 원형 연습",
  "360° 시야 스캔 드릴": "시야 확보 훈련",
  "제한 터치 빌드업": "적은 터치로 공을 앞으로 올리는 연습",
  "3v2 압박 탈출 훈련": "압박 속에서 공 빼내기 연습",
  "Rondo 압박 대응 (4v2)": "압박 받을 때 패스 유지 연습",
  "오버·언더 래핑 패턴": "옆 공간으로 빠르게 돌파하는 연습",
};

type DimensionRow = {
  key: GrowthScoreDimensionKey;
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
};

function pickDimensionScore(
  snapshot: GrowthScoreSnapshotLike | undefined,
  key: GrowthScoreDimensionKey
): number | null {
  if (!snapshot) return null;
  if (key === "SCAN") return typeof snapshot.visionScan === "number" ? snapshot.visionScan : null;
  if (key === "PRESS_RESIST") {
    return typeof snapshot.pressureResistance === "number" ? snapshot.pressureResistance : null;
  }
  return typeof snapshot.recoverySpeed === "number" ? snapshot.recoverySpeed : null;
}

function buildDimensionRows(
  current: GrowthScoreSnapshotLike | undefined,
  previous: GrowthScoreSnapshotLike | undefined
): DimensionRow[] {
  const keys: GrowthScoreDimensionKey[] = ["SCAN", "PRESS_RESIST", "QUICK_RECOVERY"];
  return keys.map((key) => {
    const cur = pickDimensionScore(current, key);
    const prev = pickDimensionScore(previous, key);
    const delta = cur !== null && prev !== null ? cur - prev : null;
    return {
      key,
      label: PARENT_DIMENSION_LABEL[key],
      current: cur,
      previous: prev,
      delta,
    };
  });
}

function parentTrainingLabel(coachTitle: string): string {
  return PARENT_TRAINING_TITLE_MAP[coachTitle] ?? coachTitle;
}

function pickNextTraining(rows: DimensionRow[]): string[] {
  const observed = rows.filter((r) => r.current !== null);
  if (!observed.length) return [];

  const weakest = [...observed].sort((a, b) => (a.current ?? 100) - (b.current ?? 100))[0]!;
  const drill = COACH_DRILL_BY_DIMENSION[weakest.key];
  return [parentTrainingLabel(drill)];
}

export function buildWeeklyDigestSummary(input: {
  latestSession: WeeklyDigestSessionInput;
  previousSession: WeeklyDigestSessionInput | null;
}): WeeklyDigestSummary {
  const currentScore = input.latestSession.metrics.growthScore?.overall ?? null;
  const previousScore = input.previousSession?.metrics.growthScore?.overall ?? null;
  const delta =
    currentScore !== null && previousScore !== null ? currentScore - previousScore : null;

  const dimensionRows = buildDimensionRows(
    input.latestSession.metrics.growthScore,
    input.previousSession?.metrics.growthScore
  );

  const strengths = dimensionRows
    .filter((r) => r.delta !== null && r.delta > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 2)
    .map((r) => `${r.label} 향상`);

  const improvements = dimensionRows
    .filter((r) => r.delta !== null && r.delta < 0)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 1)
    .map((r) => `${r.label} 보완`);

  const nextTraining = pickNextTraining(dimensionRows);

  return {
    scoreCurrent: currentScore,
    scorePrevious: previousScore,
    delta,
    strengths,
    improvements,
    nextTraining,
  };
}

export function seoulWeekBounds(ms: number): {
  weekKey: string;
  startMs: number;
  endMs: number;
} {
  const { y, M, d } = seoulCalendarFromInstant(ms);
  const noonUtc = Date.UTC(y, M - 1, d, 3, 0, 0, 0);
  const seoulDay = new Date(noonUtc).getUTCDay();
  const daysFromMonday = seoulDay === 0 ? 6 : seoulDay - 1;
  const mondayMs = noonUtc - daysFromMonday * 24 * 60 * 60 * 1000;
  const startMs = mondayMs - 3 * 60 * 60 * 1000;
  const endMs = startMs + 7 * 24 * 60 * 60 * 1000 - 1;

  const mondayParts = seoulCalendarFromInstant(startMs);
  const weekNum = isoWeekNumber(mondayParts.y, mondayParts.M, mondayParts.d);
  const weekKey = `${mondayParts.y}W${String(weekNum).padStart(2, "0")}`;

  return { weekKey, startMs, endMs };
}

function isoWeekNumber(y: number, M: number, d: number): number {
  const target = new Date(Date.UTC(y, M - 1, d));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function isDeliveredSession(session: WeeklyDigestSessionInput): boolean {
  return Boolean(session.delivery?.pdfDownloadUrl?.trim());
}

export function filterSessionsInWeek(
  sessions: WeeklyDigestSessionInput[],
  startMs: number,
  endMs: number
): WeeklyDigestSessionInput[] {
  return sessions.filter(
    (s) => s.generatedAt >= startMs && s.generatedAt <= endMs && isDeliveredSession(s)
  );
}

export function groupSessionsByPlayer(
  sessions: WeeklyDigestSessionInput[]
): Map<string, WeeklyDigestSessionInput[]> {
  const map = new Map<string, WeeklyDigestSessionInput[]>();
  for (const session of sessions) {
    const key = session.playerId.trim() || session.playerName.trim();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  return map;
}

export function buildWeeklyDigestForPlayer(input: {
  weekKey: string;
  weekStartMs: number;
  weekEndMs: number;
  weekSessions: WeeklyDigestSessionInput[];
  allSessions: WeeklyDigestSessionInput[];
  nowMs: number;
}): WeeklyDigestDocPayload | null {
  const { weekKey, weekStartMs, weekEndMs, weekSessions, allSessions, nowMs } = input;
  if (weekSessions.length === 0) return null;

  const sortedWeek = [...weekSessions].sort((a, b) => b.generatedAt - a.generatedAt);
  const latest = sortedWeek[0]!;

  const priorPool = allSessions
    .filter((s) => s.generatedAt < latest.generatedAt && isDeliveredSession(s))
    .sort((a, b) => b.generatedAt - a.generatedAt);
  const previous = priorPool[0] ?? null;

  const summary = buildWeeklyDigestSummary({
    latestSession: latest,
    previousSession: previous,
  });

  return {
    schemaVersion: WEEKLY_DIGEST_SCHEMA_VERSION,
    playerId: latest.playerId,
    playerName: latest.playerName,
    weekKey,
    weekStartMs,
    weekEndMs,
    summary,
    latestSessionId: latest.sessionId,
    latestSharePath: latest.delivery?.sharePath?.trim() ?? null,
    sessionCount: weekSessions.length,
    createdAt: nowMs,
  };
}

export function weeklyDigestDocId(playerId: string, weekKey: string): string {
  const safePlayer = playerId.trim().replace(/[/\\]/g, "_") || "unknown";
  return `${safePlayer}_${weekKey}`;
}
