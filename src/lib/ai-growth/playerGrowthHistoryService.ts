import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import type { ReportTone } from "@/components/ai-growth/guardianNarrative";
import type { ReviewContextLike } from "@/components/ai-growth/growthReportTrust";
import {
  appendGrowthHistorySession,
  loadPlayerGrowthHistory,
  savePlayerGrowthHistory,
} from "@/components/ai-growth/growthReportTrust";
import type { MockGrowthEvent } from "@/components/ai-growth/types";
import { auth, db } from "@/lib/firebase";
import type {
  GrowthReportDelivery,
  GrowthTrendDashboard,
  GrowthTrendWindow,
  PlayerGrowthSessionDoc,
  PlayerGrowthSessionMetrics,
  StoredVerifiedEvent,
} from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { computeGrowthScore, GROWTH_SCORE_WEIGHTS, type GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import { playerIdFromName, resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";
import { PLAYER_GROWTH_HISTORY_SCHEMA_VERSION } from "@/lib/ai-growth/playerGrowthHistoryTypes";

const MS_DAY = 24 * 60 * 60 * 1000;

export { playerIdFromName, resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";

export function buildPlayerGrowthMetrics(
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>,
  allReviewContexts: Record<string, ReviewContextLike>
): PlayerGrowthSessionMetrics {
  const scanCount = verifiedItems.filter((i) => i.event.eventType === "SCAN").length;
  const pressureResistanceCount = verifiedItems.filter((i) => i.event.eventType === "PRESS_RESIST").length;
  const recoveryCount = verifiedItems.filter((i) => i.event.eventType === "QUICK_RECOVERY").length;
  const verifiedEventCount = verifiedItems.length;
  const all = Object.values(allReviewContexts);
  const confirmed = all.filter((c) => c.action === "confirmed").length;
  const edited = all.filter((c) => c.action === "edited").length;
  const reviewed = all.length || 1;

  const growthScore =
    verifiedEventCount > 0 ? computeGrowthScore(verifiedItems).snapshot : undefined;

  return {
    scanCount,
    pressureResistanceCount,
    recoveryCount,
    verifiedEventCount,
    confirmedRatio: Number((confirmed / reviewed).toFixed(2)),
    editedRatio: Number((edited / reviewed).toFixed(2)),
    ...(growthScore ? { growthScore } : {}),
  };
}

export function buildStoredVerifiedEvents(
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>
): StoredVerifiedEvent[] {
  return verifiedItems.map(({ event, context }) => ({
    action: context.action,
    eventId: context.eventId,
    eventType: context.eventType,
    eventTimestampStart: context.eventTimestampStart ?? event.transcriptStart,
    eventTimestampEnd: context.eventTimestampEnd ?? event.transcriptEnd,
    evidence: context.evidence,
    transcript: context.transcript,
    confidence: context.confidence,
    ...(context.coachNote ? { coachNote: context.coachNote } : {}),
    videoTimestamp: context.videoTimestamp,
    savedAt: Date.now(),
  }));
}

export function buildPlayerGrowthSessionDoc(input: {
  teamId: string;
  playerName: string;
  /** C3-1 — academyPlayers canonical id when selected from roster */
  playerId?: string;
  videoId: string | null;
  tone: ReportTone;
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>;
  reviewContexts: Record<string, ReviewContextLike>;
  reviewedBy?: string;
  generatedAt?: number;
}): PlayerGrowthSessionDoc {
  const sessionId = `session-${Date.now()}`;
  const playerId = resolveGrowthPlayerIdForSession({
    playerId: input.playerId,
    displayName: input.playerName,
  });
  const verifiedEvents = buildStoredVerifiedEvents(input.verifiedItems);

  return {
    schemaVersion: PLAYER_GROWTH_HISTORY_SCHEMA_VERSION,
    firestoreDocId: sessionId,
    sessionId,
    playerId,
    playerName: input.playerName.trim() || "선수",
    videoId: input.videoId,
    generatedAt: input.generatedAt ?? Date.now(),
    reviewedBy: input.reviewedBy ?? auth.currentUser?.uid ?? "coach",
    tone: input.tone,
    verifiedEvents,
    metrics: buildPlayerGrowthMetrics(input.verifiedItems, input.reviewContexts),
  };
}

function collectionRef(teamId: string) {
  return collection(db, "teams", teamId, "playerGrowthHistory");
}

function docToSession(id: string, data: Record<string, unknown>): PlayerGrowthSessionDoc | null {
  const generatedAt = toMillis(data.generatedAt);
  if (generatedAt === null) return null;
  const metrics = data.metrics as PlayerGrowthSessionMetrics | undefined;
  if (!metrics) return null;

  return {
    schemaVersion: PLAYER_GROWTH_HISTORY_SCHEMA_VERSION,
    firestoreDocId: id,
    sessionId: String(data.sessionId ?? id),
    playerId: String(data.playerId ?? ""),
    playerName: String(data.playerName ?? ""),
    videoId: typeof data.videoId === "string" ? data.videoId : null,
    generatedAt,
    reviewedBy: String(data.reviewedBy ?? "coach"),
    tone: (data.tone as ReportTone) ?? "reassurance",
    verifiedEvents: Array.isArray(data.verifiedEvents) ? (data.verifiedEvents as StoredVerifiedEvent[]) : [],
    metrics,
    ...(data.delivery ? { delivery: data.delivery as GrowthReportDelivery } : {}),
  };
}

function toMillis(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as Timestamp).toMillis === "function") {
    return (v as Timestamp).toMillis();
  }
  return null;
}

export async function savePlayerGrowthSessionToFirestore(
  teamId: string,
  session: PlayerGrowthSessionDoc
): Promise<{ sessionId: string; source: "firestore" }> {
  const ref = await addDoc(collectionRef(teamId), {
    ...session,
    teamId,
  });
  return { sessionId: ref.id, source: "firestore" };
}

export async function getPlayerGrowthSessionByDocId(
  teamId: string,
  docId: string
): Promise<PlayerGrowthSessionDoc | null> {
  const { getDoc, doc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "teams", teamId, "playerGrowthHistory", docId));
  if (!snap.exists()) return null;
  return docToSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function listPlayerGrowthSessions(
  teamId: string,
  playerName: string,
  limit = 48
): Promise<PlayerGrowthSessionDoc[]> {
  const q = query(
    collectionRef(teamId),
    where("playerName", "==", playerName.trim() || "선수"),
    orderBy("generatedAt", "desc")
  );
  const snap = await getDocs(q);
  const out: PlayerGrowthSessionDoc[] = [];
  for (const docSnap of snap.docs) {
    const parsed = docToSession(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (parsed) out.push(parsed);
    if (out.length >= limit) break;
  }
  return out;
}

export async function listPlayerGrowthSessionsByPlayerId(
  teamId: string,
  playerId: string,
  maxSessions = 48
): Promise<PlayerGrowthSessionDoc[]> {
  const id = playerId.trim();
  if (!id) return [];
  const q = query(
    collectionRef(teamId),
    where("playerId", "==", id),
    orderBy("generatedAt", "desc"),
    limit(Math.max(1, maxSessions))
  );
  const snap = await getDocs(q);
  const out: PlayerGrowthSessionDoc[] = [];
  for (const docSnap of snap.docs) {
    const parsed = docToSession(docSnap.id, docSnap.data() as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function filterSessionsByWindow(
  sessions: PlayerGrowthSessionDoc[],
  window: GrowthTrendWindow
): PlayerGrowthSessionDoc[] {
  if (window === "season") return sessions;
  const days = window === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * MS_DAY;
  return sessions.filter((s) => s.generatedAt >= cutoff);
}

function sumMetrics(sessions: PlayerGrowthSessionDoc[]): PlayerGrowthSessionMetrics {
  const totals = {
    scanCount: 0,
    pressureResistanceCount: 0,
    recoveryCount: 0,
    verifiedEventCount: 0,
    confirmedRatio: 0,
    editedRatio: 0,
  };
  for (const s of sessions) {
    totals.scanCount += s.metrics.scanCount;
    totals.pressureResistanceCount += s.metrics.pressureResistanceCount;
    totals.recoveryCount += s.metrics.recoveryCount;
    totals.verifiedEventCount += s.metrics.verifiedEventCount;
    totals.confirmedRatio += s.metrics.confirmedRatio;
    totals.editedRatio += s.metrics.editedRatio;
  }
  const n = sessions.length || 1;
  const growthScore = averageGrowthScoreSnapshot(sessions);

  return {
    ...totals,
    confirmedRatio: Number((totals.confirmedRatio / n).toFixed(2)),
    editedRatio: Number((totals.editedRatio / n).toFixed(2)),
    ...(growthScore ? { growthScore } : {}),
  };
}

function averageGrowthScoreSnapshot(sessions: PlayerGrowthSessionDoc[]): GrowthScoreSnapshot | undefined {
  const scored = sessions.filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0);
  if (!scored.length) return undefined;

  const avg = (pick: (g: GrowthScoreSnapshot) => number | null | undefined) => {
    const vals = scored
      .map((s) => pick(s.metrics.growthScore!))
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return {
    overall: avg((g) => g.overall) ?? 0,
    visionScan: avg((g) => g.visionScan),
    pressureResistance: avg((g) => g.pressureResistance),
    recoverySpeed: avg((g) => g.recoverySpeed),
    weights: GROWTH_SCORE_WEIGHTS,
    observedEventCount: scored.reduce((s, x) => s + (x.metrics.growthScore?.observedEventCount ?? 0), 0),
  };
}

function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeGrowthTrendDashboard(
  allSessions: PlayerGrowthSessionDoc[],
  window: GrowthTrendWindow
): GrowthTrendDashboard {
  const inWindow = filterSessionsByWindow(allSessions, window);
  const aggregated = sumMetrics(inWindow);

  const midpoint = Math.floor(inWindow.length / 2);
  const recent = inWindow.slice(0, midpoint || 1);
  const older = inWindow.slice(midpoint || 1);
  const recentMetrics = sumMetrics(recent);
  const olderMetrics = sumMetrics(older.length ? older : recent);

  const scanTrendPct = trendPct(recentMetrics.scanCount, olderMetrics.scanCount);
  const pressureTrendPct = trendPct(
    recentMetrics.pressureResistanceCount,
    olderMetrics.pressureResistanceCount
  );
  const recoveryTrendPct = trendPct(recentMetrics.recoveryCount, olderMetrics.recoveryCount);

  const narratives = generateLongitudinalTrendNarrative({
    window,
    sessionCount: inWindow.length,
    aggregated,
    scanTrendPct,
    pressureTrendPct,
    recoveryTrendPct,
    confirmedRatioAvg: aggregated.confirmedRatio,
  });

  return {
    window,
    sessionCount: inWindow.length,
    aggregated,
    scanTrendPct,
    pressureTrendPct,
    recoveryTrendPct,
    confirmedRatioAvg: aggregated.confirmedRatio,
    narratives,
  };
}

export function generateLongitudinalTrendNarrative(input: {
  window: GrowthTrendWindow;
  sessionCount: number;
  aggregated: PlayerGrowthSessionMetrics;
  scanTrendPct: number | null;
  pressureTrendPct: number | null;
  recoveryTrendPct: number | null;
  confirmedRatioAvg: number;
}): string[] {
  const windowLabel =
    input.window === "7d" ? "최근 7일" : input.window === "30d" ? "최근 30일" : "시즌 누적";

  if (input.sessionCount === 0) {
    return [`${windowLabel} 구간에 저장된 코치 검증 세션이 없습니다.`];
  }

  const lines: string[] = [
    `${windowLabel} 기준 코치 검증 세션 ${input.sessionCount}회 · 검증 이벤트 ${input.aggregated.verifiedEventCount}건.`,
    `코치 승인 비율 평균 ${Math.round(input.confirmedRatioAvg * 100)}% (coach-confirmed evidence 축적).`,
  ];

  if (input.scanTrendPct !== null && input.scanTrendPct > 0) {
    lines.push(`SCAN 빈도가 ${windowLabel} 구간에서 약 +${input.scanTrendPct}% 변화했습니다.`);
  }
  if (input.pressureTrendPct !== null && input.pressureTrendPct >= 0) {
    lines.push(`PRESS_RESIST(압박 저항) 신호가 안정적으로 관찰되고 있습니다.`);
  }
  if (input.recoveryTrendPct !== null && input.recoveryTrendPct > 0) {
    lines.push(
      `최근 ${input.window === "7d" ? "3주" : "구간"} 동안 QUICK_RECOVERY 반응이 개선되는 추세입니다.`
    );
  } else if (input.aggregated.recoveryCount > 0) {
    lines.push(`QUICK_RECOVERY(실수 후 회복) 코치 검증 ${input.aggregated.recoveryCount}건이 누적되었습니다.`);
  }

  if (typeof input.aggregated.growthScore?.overall === "number" && input.aggregated.growthScore.overall > 0) {
    lines.push(
      `${windowLabel} 구간 평균 Growth Score 약 ${input.aggregated.growthScore.overall}점 (코치 검증 세션 누적).`
    );
  }

  return lines;
}

/** Firestore canonical + localStorage fallback mirror */
export async function persistPlayerGrowthSession(input: {
  teamId: string;
  playerName: string;
  playerId?: string;
  videoId: string | null;
  tone: ReportTone;
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>;
  reviewContexts: Record<string, ReviewContextLike>;
}): Promise<{ sessionId: string; source: "firestore" | "local" }> {
  const session = buildPlayerGrowthSessionDoc(input);

  try {
    const saved = await savePlayerGrowthSessionToFirestore(input.teamId, session);
    mirrorToLocalStorage(input.teamId, input.playerName, session);
    return { sessionId: saved.sessionId, source: "firestore" };
  } catch (error) {
    console.warn("[playerGrowthHistory] Firestore save failed, using local fallback", error);
    mirrorToLocalStorage(input.teamId, input.playerName, session);
    return { sessionId: session.sessionId, source: "local" };
  }
}

function mirrorToLocalStorage(teamId: string, playerName: string, session: PlayerGrowthSessionDoc) {
  const existing = loadPlayerGrowthHistory(teamId, playerName);
  const legacySession = {
    sessionId: session.sessionId,
    teamId,
    playerName: session.playerName,
    videoId: session.videoId,
    generatedAt: session.generatedAt,
    tone: session.tone,
    verifiedEventCount: session.metrics.verifiedEventCount,
    eventTypeCounts: {
      SCAN: session.metrics.scanCount,
      PRESS_RESIST: session.metrics.pressureResistanceCount,
      QUICK_RECOVERY: session.metrics.recoveryCount,
    },
  };
  const next = appendGrowthHistorySession(existing, teamId, playerName, legacySession);
  savePlayerGrowthHistory(next);
}

export async function loadGrowthHistoryCanonical(
  teamId: string,
  playerName: string,
  options?: { playerId?: string }
): Promise<{ sessions: PlayerGrowthSessionDoc[]; source: "firestore" | "local" }> {
  const canonicalId = options?.playerId?.trim();
  if (canonicalId) {
    try {
      const byId = await listPlayerGrowthSessionsByPlayerId(teamId, canonicalId);
      if (byId.length > 0) {
        return { sessions: byId, source: "firestore" };
      }
    } catch (error) {
      console.warn("[playerGrowthHistory] Firestore load by playerId failed", error);
    }
  }

  try {
    const sessions = await listPlayerGrowthSessions(teamId, playerName);
    if (sessions.length > 0) {
      return { sessions, source: "firestore" };
    }
  } catch (error) {
    console.warn("[playerGrowthHistory] Firestore load failed", error);
  }

  const local = loadPlayerGrowthHistory(teamId, playerName);
  if (!local?.sessions.length) {
    return { sessions: [], source: "local" };
  }

  const sessions: PlayerGrowthSessionDoc[] = local.sessions.map((s) => ({
    schemaVersion: PLAYER_GROWTH_HISTORY_SCHEMA_VERSION,
    firestoreDocId: s.sessionId,
    sessionId: s.sessionId,
    playerId: playerIdFromName(s.playerName),
    playerName: s.playerName,
    videoId: s.videoId,
    generatedAt: s.generatedAt,
    reviewedBy: "coach",
    tone: s.tone,
    verifiedEvents: [],
    metrics: {
      scanCount: s.eventTypeCounts.SCAN ?? 0,
      pressureResistanceCount: s.eventTypeCounts.PRESS_RESIST ?? 0,
      recoveryCount: s.eventTypeCounts.QUICK_RECOVERY ?? 0,
      verifiedEventCount: s.verifiedEventCount,
      confirmedRatio: 1,
      editedRatio: 0,
    },
  }));
  return { sessions, source: "local" };
}
