import type { MockGrowthEvent, TranscriptSegment } from "@/components/ai-growth/types";
import type { ReviewContextLike, VerificationSummary } from "@/components/ai-growth/growthReportTrust";

export type CoachReviewAction = "confirmed" | "rejected" | "edited";

export type CoachReviewContext = ReviewContextLike & {
  eventTimestampStart: number;
  eventTimestampEnd: number;
  savedAt: number;
};

export type VerifiedReportItem = {
  event: MockGrowthEvent;
  context: CoachReviewContext;
};

/** GPT/데모 이벤트 id·종료 시각 정규화 */
export function normalizeGrowthEvents(raw: MockGrowthEvent[]): MockGrowthEvent[] {
  return raw.map((event, index) => {
    const transcriptStart = Number.isFinite(event.transcriptStart) ? event.transcriptStart : 0;
    const transcriptEnd = Number.isFinite(event.transcriptEnd)
      ? event.transcriptEnd
      : Number.isFinite(event.timestampEnd)
        ? event.timestampEnd!
        : transcriptStart + 2;
    return {
      ...event,
      id: event.id?.trim() ? event.id.trim() : `growth-${index + 1}`,
      transcriptStart,
      transcriptEnd,
      timestampEnd: Number.isFinite(event.timestampEnd) ? event.timestampEnd : transcriptEnd,
      reviewStatus: event.reviewStatus ?? "candidate",
    };
  });
}

export function buildCoachReviewContextFromEvent(input: {
  event: MockGrowthEvent;
  action: CoachReviewAction;
  transcript: string;
  videoTimestamp: number;
  coachNote?: string;
}): CoachReviewContext {
  const { event, action, transcript, videoTimestamp, coachNote } = input;
  const end = Number.isFinite(event.transcriptEnd) ? event.transcriptEnd : event.transcriptStart + 2;
  return {
    action,
    eventId: event.id,
    eventType: event.eventType,
    eventTimestampStart: event.transcriptStart,
    eventTimestampEnd: end,
    evidence: event.evidence,
    transcript,
    confidence: event.confidence,
    videoTimestamp: videoTimestamp > 0 ? videoTimestamp : Math.floor(event.transcriptStart),
    savedAt: Date.now(),
    ...(coachNote?.trim() ? { coachNote: coachNote.trim() } : {}),
  };
}

/**
 * Step4 승인 → Step5 리포트 연결.
 * reviewContexts만 보면 events 재로드 시 0건이 되므로 event.reviewStatus를 SoT로 병합한다.
 */
export function buildVerifiedReportItems(
  events: MockGrowthEvent[],
  reviewContexts: Record<string, CoachReviewContext>,
  transcriptSegments: TranscriptSegment[]
): VerifiedReportItem[] {
  const out: VerifiedReportItem[] = [];
  const seen = new Set<string>();

  const transcriptFor = (event: MockGrowthEvent) =>
    buildTranscriptSnippetForEvent(event, transcriptSegments);

  for (const event of events) {
    const stored = reviewContexts[event.id];
    const isVerified =
      event.reviewStatus === "confirmed" || stored?.action === "confirmed" || stored?.action === "edited";
    if (!isVerified) continue;
    const action: CoachReviewAction = stored?.action === "edited" ? "edited" : "confirmed";
    const context =
      stored && (stored.action === "confirmed" || stored.action === "edited")
        ? { ...stored, action, eventId: event.id }
        : buildCoachReviewContextFromEvent({
            event,
            action,
            transcript: transcriptFor(event),
            videoTimestamp: Math.floor(event.transcriptStart),
            coachNote: event.coachNote,
          });
    out.push({ event, context });
    seen.add(event.id);
  }

  for (const ctx of Object.values(reviewContexts)) {
    if (ctx.action !== "confirmed" && ctx.action !== "edited") continue;
    if (seen.has(ctx.eventId)) continue;
    const event = events.find((item) => item.id === ctx.eventId);
    if (!event) continue;
    out.push({
      event,
      context: {
        ...ctx,
        eventId: event.id,
        eventTimestampStart: event.transcriptStart,
        eventTimestampEnd: Number.isFinite(event.transcriptEnd)
          ? event.transcriptEnd
          : ctx.eventTimestampEnd,
      },
    });
    seen.add(event.id);
  }

  out.sort((a, b) => a.context.videoTimestamp - b.context.videoTimestamp);
  return out;
}

export function buildVerificationSummaryMerged(
  events: MockGrowthEvent[],
  reviewContexts: Record<string, CoachReviewContext>
): VerificationSummary {
  const verifiedItems = buildVerifiedReportItems(events, reviewContexts, []);
  const fromContexts = Object.values(reviewContexts);
  const rejectedCount = fromContexts.filter((c) => c.action === "rejected").length;
  const confirmedCount = verifiedItems.filter((i) => i.context.action === "confirmed").length;
  const editedCount = verifiedItems.filter((i) => i.context.action === "edited").length;
  const reviewedIds = new Set<string>([
    ...fromContexts.map((c) => c.eventId),
    ...events.filter((e) => e.reviewStatus !== "candidate").map((e) => e.id),
  ]);
  const reviewedCount = reviewedIds.size;
  const verifiedForReportCount = verifiedItems.length;

  return {
    coachVerified: verifiedForReportCount > 0,
    reviewedCount,
    confirmedCount,
    editedCount,
    rejectedCount,
    verifiedForReportCount,
  };
}

function buildTranscriptSnippetForEvent(event: MockGrowthEvent, segments: TranscriptSegment[]): string {
  const end = Number.isFinite(event.transcriptEnd) ? event.transcriptEnd : event.transcriptStart + 2;
  const hit = segments
    .filter((segment) => segment.end >= event.transcriptStart && segment.start <= end)
    .map((segment) => segment.text.trim())
    .filter(Boolean);
  return hit.length > 0 ? hit.join(" ") : event.evidence;
}
