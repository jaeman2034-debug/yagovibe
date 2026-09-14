import type { ExactParticipant, FederationMatch, FederationMatchStatus, MatchSide } from "../matchOps/federationMatchOps";

type Source = FederationMatch;
type PublicStatus = "BEFORE" | "LIVE" | "REVIEW" | "OFFICIAL" | "POSTPONED" | "SUSPENDED" | "CANCELLED" | "FORFEITED";
export type ProjectionEvent = { id: string; type: string; status: string; teamSide?: MatchSide | null; minute?: number | null; publicSafeText?: string | null };
export type ProjectionIdentity = Pick<ExactParticipant, "id" | "platformTeamId" | "federationTeamId" | "linkStatus"> | null;
export type ExistingClubProjection = { id: string; matchId: string; platformTeamId: string };
export type ProjectionSnapshot = {
  match: Source | null;
  home: ProjectionIdentity;
  away: ProjectionIdentity;
};
export type ProjectionIntent = {
  publicMatch: {
    matchId: string;
    publicVisible: boolean;
    visibilityGate: "ELIGIBLE" | "BLOCKED" | "UNKNOWN";
    publicStatus: PublicStatus | null;
    homeScore?: number;
    awayScore?: number;
    homeDisplayName: string | null;
    awayDisplayName: string | null;
    homeParticipantId: string | null;
    awayParticipantId: string | null;
    scheduledAt: string | null;
    reason?: string;
  };
  club: { matchId: string; visiblePlatformTeamIds: string[]; keepOrUpsertIds: string[]; hideProjectionIds: string[] };
  noticeRecomputePlatformTeamIds: string[];
  noticeRecomputeRequired: boolean;
  publicStoryEvents: Array<{ eventId: string; type: string; teamSide: MatchSide; minute: number | null; period: null; maskedPlayerName: null; publicSafeText: string }>;
  writesCanonicalMatch: false;
  writesCanonicalEvents: false;
  propagatesBracket: false;
};

const statusMap: Record<FederationMatchStatus, PublicStatus> = {
  SCHEDULED: "BEFORE", READY: "BEFORE", LIVE: "LIVE", FIRST_HALF: "LIVE",
  HALFTIME: "LIVE", SECOND_HALF: "LIVE", FINISHED: "REVIEW",
  REVIEW_REQUIRED: "REVIEW", CONFIRMED: "REVIEW", OFFICIAL: "OFFICIAL",
  POSTPONED: "POSTPONED", SUSPENDED: "SUSPENDED", CANCELLED: "CANCELLED",
  FORFEITED: "FORFEITED",
};

function exactTeamId(matchParticipantId: string | null, participant: ProjectionIdentity): string | null {
  return matchParticipantId && participant?.id === matchParticipantId &&
    participant.linkStatus === "EXACT_LINKED" && participant.platformTeamId &&
    participant.federationTeamId ? participant.platformTeamId : null;
}

/** Pure reconciliation intent. The writer must query existing club rows by matchId and hide stale IDs. */
export function planCanonicalProjection(
  matchId: string,
  before: ProjectionSnapshot | null,
  after: ProjectionSnapshot | null,
  events: readonly ProjectionEvent[],
  existingClubProjections: readonly ExistingClubProjection[] = [],
  participantLinkHistoryComplete = false,
): ProjectionIntent {
  const match = after?.match ?? null;
  const status = match ? statusMap[match.status] ?? null : null;
  const homeName = match?.homeTeamName?.trim() || null;
  const awayName = match?.awayTeamName?.trim() || null;
  const scheduledAt = match?.scheduledAt?.trim() || null;
  const scoresValid = match?.homeScore != null && match?.awayScore != null &&
    Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore);
  const visibilityGate = !match ? "BLOCKED" :
    match.isCanary === true || match.hiddenFromFieldHub === true ? "BLOCKED" :
    match.isCanary !== false || match.hiddenFromFieldHub !== false ? "UNKNOWN" : "ELIGIBLE";
  const reason = !match ? "SOURCE_DELETED" : match.isCanary === true ? "CANARY" :
    match.hiddenFromFieldHub === true ? "HIDDEN" : visibilityGate === "UNKNOWN" ? "VISIBILITY_UNKNOWN" :
    !status ? "INVALID_STATUS" :
    !homeName || !awayName ? "MISSING_DISPLAY_NAME" : !scheduledAt ? "MISSING_SCHEDULE" :
    !scoresValid ? "SCORE_INCOMPLETE" : null;
  const visible = reason === null;
  const currentTeamIds = visible && match ? [
    exactTeamId(match.homeTeamId, after?.home ?? null),
    exactTeamId(match.awayTeamId, after?.away ?? null),
  ].filter((id): id is string => Boolean(id)) : [];
  const prior = before?.match;
  const priorTeamIds = prior ? [
    exactTeamId(prior.homeTeamId, before?.home ?? null),
    exactTeamId(prior.awayTeamId, before?.away ?? null),
  ].filter((id): id is string => Boolean(id)) : [];
  const storyById = new Map<string, ProjectionEvent>();
  if (visible) for (const event of events) {
    if (event.status === "CONFIRMED" && event.id &&
        typeof event.publicSafeText === "string" && event.publicSafeText.trim() &&
        ["GOAL", "YELLOW", "RED"].includes(event.type) &&
        (event.teamSide === "home" || event.teamSide === "away")) storyById.set(event.id, event);
  }
  const publicStoryEvents = [...storyById.values()]
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || a.id.localeCompare(b.id))
    .map(event => ({ eventId: event.id, type: event.type,
      teamSide: event.teamSide as MatchSide, minute: event.minute ?? null,
      period: null as null, maskedPlayerName: null as null,
      publicSafeText: event.publicSafeText!.trim() }));
  const keepOrUpsertIds = [...new Set(currentTeamIds.map(id => `${id}__${matchId}`))].sort();
  const keepIds = new Set(keepOrUpsertIds);
  const hideProjectionIds = existingClubProjections
    .filter(row => row.matchId === matchId && !keepIds.has(row.id))
    .map(row => row.id).sort();
  return {
    publicMatch: {
      matchId, publicVisible: visible, visibilityGate, publicStatus: status,
      ...(scoresValid ? { homeScore: match!.homeScore as number, awayScore: match!.awayScore as number } : {}),
      homeDisplayName: homeName, awayDisplayName: awayName,
      homeParticipantId: match?.homeTeamId ?? null, awayParticipantId: match?.awayTeamId ?? null,
      scheduledAt, ...(reason ? { reason } : {}),
    },
    club: { matchId, visiblePlatformTeamIds: [...new Set(currentTeamIds)].sort(),
      keepOrUpsertIds, hideProjectionIds },
    noticeRecomputePlatformTeamIds: [...new Set([...priorTeamIds, ...currentTeamIds])].sort(),
    noticeRecomputeRequired: !participantLinkHistoryComplete,
    publicStoryEvents,
    writesCanonicalMatch: false, writesCanonicalEvents: false, propagatesBracket: false,
  };
}
