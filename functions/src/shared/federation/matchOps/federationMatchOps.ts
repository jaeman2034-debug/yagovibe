/** Canonical federation MatchOps domain values. No persistence authority lives here. */
export type FederationMatchStatus =
  | "SCHEDULED" | "READY" | "LIVE" | "FIRST_HALF" | "HALFTIME"
  | "SECOND_HALF" | "FINISHED" | "REVIEW_REQUIRED" | "CONFIRMED"
  | "OFFICIAL" | "POSTPONED" | "SUSPENDED" | "CANCELLED" | "FORFEITED";

export type MatchSide = "home" | "away";
export type MatchSourceOutcome = "WINNER" | "LOSER";
export type ExactParticipant = {
  id: string;
  federationTeamId: string;
  platformTeamId: string;
  linkStatus: "EXACT_LINKED" | "DISPLAY_ONLY" | "AMBIGUOUS" | "UNMATCHED";
};
export type BracketSource = {
  matchId: string;
  outcome: MatchSourceOutcome;
  side: MatchSide;
};
export type FederationMatch = {
  id: string;
  federationId: string;
  tournamentId: string;
  status: FederationMatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName?: string;
  awayTeamName?: string;
  scheduledAt?: string;
  homeSource?: BracketSource | null;
  awaySource?: BracketSource | null;
  winnerSide?: MatchSide | null;
};
export type FederationMatchEvent = {
  id: string;
  type: string;
  teamSide?: MatchSide | null;
  status: "CONFIRMED" | "PENDING" | "VOID";
};
export type DomainDecision<T> = { ok: true; value: T } | { ok: false; reason: string };
