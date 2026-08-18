import type { ReviewContextLike } from "@/components/ai-growth/growthReportTrust";
import type { MockGrowthEvent } from "@/components/ai-growth/types";
import type { GrowthConfidence } from "@/components/ai-growth/types";
import type { StoredVerifiedEvent } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

function asConfidence(v: string): GrowthConfidence {
  if (v === "HIGH" || v === "MEDIUM" || v === "LOW") return v;
  return "MEDIUM";
}

function asEventType(v: string): MockGrowthEvent["eventType"] {
  if (v === "SCAN" || v === "PRESS_RESIST" || v === "QUICK_RECOVERY") return v;
  return "SCAN";
}

export function storedEventsToVerifiedItems(
  session: PlayerGrowthSessionDoc
): Array<{ event: MockGrowthEvent; context: ReviewContextLike }> {
  return session.verifiedEvents
    .filter((e) => e.action === "confirmed" || e.action === "edited")
    .map((e: StoredVerifiedEvent, i) => ({
      event: {
        id: e.eventId || `ev-${i}`,
        eventType: asEventType(e.eventType),
        timestampStart: e.eventTimestampStart,
        timestampEnd: e.eventTimestampEnd,
        confidence: asConfidence(String(e.confidence)),
        reviewStatus: "confirmed" as const,
        transcriptStart: e.eventTimestampStart,
        transcriptEnd: e.eventTimestampEnd,
        evidence: e.evidence,
        guardianPhrase: e.evidence,
        coachNote: e.coachNote,
      },
      context: {
        action: e.action,
        eventId: e.eventId,
        eventType: e.eventType,
        evidence: e.evidence,
        transcript: e.transcript,
        confidence: asConfidence(String(e.confidence)),
        coachNote: e.coachNote,
        videoTimestamp: e.videoTimestamp,
      },
    }));
}

export const GROWTH_REPORT_VIEWED_STORAGE_PREFIX = "yago-growth-report-viewed";

export function growthReportViewedStorageKey(teamId: string, sessionDocId: string): string {
  return `${GROWTH_REPORT_VIEWED_STORAGE_PREFIX}:${teamId}:${sessionDocId}`;
}

export function markGrowthReportViewedLocally(teamId: string, sessionDocId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(growthReportViewedStorageKey(teamId, sessionDocId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isGrowthReportViewedLocally(teamId: string, sessionDocId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(growthReportViewedStorageKey(teamId, sessionDocId)) != null;
  } catch {
    return false;
  }
}
