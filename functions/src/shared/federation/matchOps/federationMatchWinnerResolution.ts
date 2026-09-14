import type { DomainDecision, ExactParticipant, FederationMatch, MatchSide } from "./federationMatchOps";

export function resolveMatchWinner(
  match: FederationMatch,
  home: ExactParticipant | null,
  away: ExactParticipant | null,
): DomainDecision<{ side: MatchSide; participant: ExactParticipant }> {
  if (!home || !away || home.linkStatus !== "EXACT_LINKED" || away.linkStatus !== "EXACT_LINKED" ||
      !home.id || !away.id || home.id === away.id ||
      !home.federationTeamId || !away.federationTeamId ||
      !home.platformTeamId || !away.platformTeamId ||
      home.federationTeamId === away.federationTeamId ||
      home.platformTeamId === away.platformTeamId ||
      match.homeTeamId !== home.id || match.awayTeamId !== away.id) {
    return { ok: false, reason: "HOLD: participant identity is not exact" };
  }
  if (match.homeScore === null || match.awayScore === null ||
      !Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore) ||
      match.homeScore < 0 || match.awayScore < 0) {
    return { ok: false, reason: "HOLD: score is incomplete" };
  }
  if (match.homeScore === match.awayScore) return { ok: false, reason: "HOLD: tied score needs an explicit decision" };
  const side: MatchSide = match.homeScore > match.awayScore ? "home" : "away";
  return { ok: true, value: { side, participant: side === "home" ? home : away } };
}
