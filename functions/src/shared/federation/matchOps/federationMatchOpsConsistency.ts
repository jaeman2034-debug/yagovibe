import type { DomainDecision, ExactParticipant, FederationMatch, FederationMatchEvent } from "./federationMatchOps";
import { bracketDependenciesReady, inspectBracketDependency } from "./federationMatchBracketDependency";
import { inspectBracketChronology } from "./federationMatchBracketChronology";
import { resolveMatchWinner } from "./federationMatchWinnerResolution";

export function assessMatchScoreEventConsistency(
  match: FederationMatch,
  events: readonly FederationMatchEvent[],
): DomainDecision<{ homeGoals: number; awayGoals: number }> {
  if (match.homeScore === null || match.awayScore === null ||
      !Number.isInteger(match.homeScore) || !Number.isInteger(match.awayScore) ||
      match.homeScore < 0 || match.awayScore < 0) {
    return { ok: false, reason: "HOLD: score missing or invalid" };
  }
  let homeGoals = 0;
  let awayGoals = 0;
  for (const event of events) {
    if (event.type !== "GOAL" || event.status !== "CONFIRMED") continue;
    if (event.teamSide === "home") homeGoals++;
    else if (event.teamSide === "away") awayGoals++;
    else return { ok: false, reason: "HOLD: confirmed goal has no exact side" };
  }
  return homeGoals === match.homeScore && awayGoals === match.awayScore
    ? { ok: true, value: { homeGoals, awayGoals } }
    : { ok: false, reason: "HOLD: score and confirmed events differ" };
}

export function assessOfficialReadiness(
  match: FederationMatch,
  events: readonly FederationMatchEvent[],
  home: ExactParticipant | null,
  away: ExactParticipant | null,
  sourceMatches: readonly FederationMatch[] = [],
): DomainDecision<true> {
  if (match.status !== "CONFIRMED") return { ok: false, reason: "HOLD: match is not confirmed" };
  const score = assessMatchScoreEventConsistency(match, events);
  if (score.ok === false) return { ok: false, reason: score.reason };
  const bracket = bracketDependenciesReady(match);
  if (bracket.ok === false) return { ok: false, reason: bracket.reason };
  if (match.homeSource || match.awaySource) {
    const chronology = inspectBracketChronology(match, sourceMatches);
    if (chronology.ok === false) return { ok: false, reason: chronology.reason };
    for (const side of ["home", "away"] as const) {
      const ref = side === "home" ? match.homeSource : match.awaySource;
      if (!ref) continue;
      const dependency = inspectBracketDependency(match, side, sourceMatches);
      if (dependency.ok === false) return { ok: false, reason: dependency.reason };
      const source = dependency.value.source;
      if (!source.winnerSide) return { ok: false, reason: "HOLD: source winner not resolved" };
      const sourceSide = ref.outcome === "WINNER" ? source.winnerSide :
        source.winnerSide === "home" ? "away" : "home";
      const expectedId = sourceSide === "home" ? source.homeTeamId : source.awayTeamId;
      const actualId = side === "home" ? match.homeTeamId : match.awayTeamId;
      if (!expectedId || expectedId !== actualId) {
        return { ok: false, reason: "HOLD: dependent participant does not match source result" };
      }
    }
  }
  const winner = resolveMatchWinner(match, home, away);
  if (winner.ok === false) return { ok: false, reason: winner.reason };
  return { ok: true, value: true };
}
