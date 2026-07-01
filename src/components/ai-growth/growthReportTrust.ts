import type { ReportTone } from "@/components/ai-growth/guardianNarrative";
import { buildEventReportBlock, resolveGuardianClaim } from "@/components/ai-growth/guardianReportCopy";
import type { MockGrowthEvent } from "@/components/ai-growth/types";

export type CoachReviewAction = "confirmed" | "rejected" | "edited";

export type ReviewContextLike = {
  action: CoachReviewAction;
  eventId: string;
  eventType: string;
  evidence: string;
  transcript: string;
  confidence: MockGrowthEvent["confidence"];
  coachNote?: string;
  videoTimestamp: number;
};

export type VerificationSummary = {
  coachVerified: boolean;
  reviewedCount: number;
  confirmedCount: number;
  editedCount: number;
  rejectedCount: number;
  verifiedForReportCount: number;
};

export type GuardianReportMetadata = {
  generatedAt: number;
  reviewedBy: string;
  reviewedEventCount: number;
  tone: ReportTone;
  videoId: string | null;
  teamId: string;
  playerName: string;
};

export type EvidenceReportItem = {
  eventId: string;
  eventType: string;
  seekSeconds: number;
  claim: string;
  meaning: string;
  training: string;
  evidence: string;
  transcript: string;
  coachNote: string | null;
  confidence: MockGrowthEvent["confidence"];
  coachAction: CoachReviewAction;
  coachVerifiedLabel: string;
};

export type PlayerGrowthHistorySession = {
  sessionId: string;
  teamId: string;
  playerName: string;
  videoId: string | null;
  generatedAt: number;
  tone: ReportTone;
  verifiedEventCount: number;
  eventTypeCounts: Record<string, number>;
};

export type PlayerGrowthHistory = {
  schemaVersion: 1;
  playerKey: string;
  sessions: PlayerGrowthHistorySession[];
};

const HISTORY_STORAGE_PREFIX = "yago-player-growth-history";

export function buildVerificationSummary(
  reviewContexts: Record<string, ReviewContextLike>
): VerificationSummary {
  const all = Object.values(reviewContexts);
  const confirmedCount = all.filter((c) => c.action === "confirmed").length;
  const editedCount = all.filter((c) => c.action === "edited").length;
  const rejectedCount = all.filter((c) => c.action === "rejected").length;
  const reviewedCount = all.length;
  const verifiedForReportCount = confirmedCount + editedCount;

  return {
    coachVerified: verifiedForReportCount > 0,
    reviewedCount,
    confirmedCount,
    editedCount,
    rejectedCount,
    verifiedForReportCount,
  };
}

export function buildReportMetadata(input: {
  teamId: string;
  playerName: string;
  tone: ReportTone;
  videoId: string | null;
  reviewedEventCount: number;
  reviewedBy?: string;
  generatedAt?: number;
}): GuardianReportMetadata {
  return {
    generatedAt: input.generatedAt ?? Date.now(),
    reviewedBy: input.reviewedBy ?? "coach",
    reviewedEventCount: input.reviewedEventCount,
    tone: input.tone,
    videoId: input.videoId,
    teamId: input.teamId,
    playerName: input.playerName,
  };
}

export function buildEvidenceItems(
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>,
  playerName = "선수"
): EvidenceReportItem[] {
  return verifiedItems.map(({ event, context }) => {
    const block = buildEventReportBlock(playerName, event, context);
    return {
      eventId: event.id,
      eventType: event.eventType,
      seekSeconds: block.seekSeconds,
      claim: resolveGuardianClaim(event, context, playerName),
      meaning: block.meaning,
      training: block.training,
      evidence: context.evidence,
      transcript: context.transcript,
      coachNote: context.coachNote ?? event.coachNote ?? null,
      confidence: event.confidence,
      coachAction: context.action,
      coachVerifiedLabel:
        context.action === "edited" ? "Coach Edited & Verified" : "Coach Confirmed",
    };
  });
}

export function playerGrowthHistoryKey(teamId: string, playerName: string): string {
  const safeName = playerName.trim() || "player";
  return `${HISTORY_STORAGE_PREFIX}:${teamId}:${safeName}`;
}

export function loadPlayerGrowthHistory(teamId: string, playerName: string): PlayerGrowthHistory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(playerGrowthHistoryKey(teamId, playerName));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerGrowthHistory;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlayerGrowthHistory(history: PlayerGrowthHistory): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(history.playerKey, JSON.stringify(history));
}

export function buildSessionSnapshot(input: {
  teamId: string;
  playerName: string;
  videoId: string | null;
  tone: ReportTone;
  verifiedItems: Array<{ event: MockGrowthEvent; context: ReviewContextLike }>;
}): PlayerGrowthHistorySession {
  const eventTypeCounts: Record<string, number> = {};
  for (const { event } of input.verifiedItems) {
    eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] ?? 0) + 1;
  }
  return {
    sessionId: `session-${Date.now()}`,
    teamId: input.teamId,
    playerName: input.playerName,
    videoId: input.videoId,
    generatedAt: Date.now(),
    tone: input.tone,
    verifiedEventCount: input.verifiedItems.length,
    eventTypeCounts,
  };
}

export function appendGrowthHistorySession(
  existing: PlayerGrowthHistory | null,
  teamId: string,
  playerName: string,
  session: PlayerGrowthHistorySession
): PlayerGrowthHistory {
  const playerKey = playerGrowthHistoryKey(teamId, playerName);
  const base: PlayerGrowthHistory = existing ?? {
    schemaVersion: 1,
    playerKey,
    sessions: [],
  };
  return {
    ...base,
    playerKey,
    sessions: [...base.sessions, session].slice(-24),
  };
}

export function computeGrowthTrendHints(
  current: PlayerGrowthHistorySession,
  previous: PlayerGrowthHistorySession | null
): string[] {
  if (!previous) {
    return ["첫 세션 기록입니다. 다음 세션부터 주간 비교 트렌드를 표시할 수 있습니다."];
  }
  const hints: string[] = [];
  for (const [type, count] of Object.entries(current.eventTypeCounts)) {
    const prev = previous.eventTypeCounts[type] ?? 0;
    if (prev === 0 && count > 0) {
      hints.push(`${type} 신규 관찰 (+${count}회, 코치 검증)`);
      continue;
    }
    if (prev > 0) {
      const deltaPct = Math.round(((count - prev) / prev) * 100);
      if (deltaPct > 0) hints.push(`${type} 빈도 +${deltaPct}% (이전 ${prev}회 → 현재 ${count}회)`);
      else if (deltaPct < 0) hints.push(`${type} 빈도 ${deltaPct}% (이전 ${prev}회 → 현재 ${count}회)`);
      else hints.push(`${type} 빈도 유지 (${count}회)`);
    }
  }
  if (current.verifiedEventCount > previous.verifiedEventCount) {
    hints.push(
      `검증 이벤트 수 증가: ${previous.verifiedEventCount} → ${current.verifiedEventCount}`
    );
  }
  return hints.length > 0 ? hints : ["이번 세션은 이전 대비 뚜렷한 빈도 변화가 없습니다."];
}

export function formatReportGeneratedAt(ms: number): string {
  return new Date(ms).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
