import type { BracketSource, DomainDecision, FederationMatch, MatchSide } from "./federationMatchOps";

export function inspectBracketDependency(
  dependent: FederationMatch,
  side: MatchSide,
  matches: readonly FederationMatch[],
): DomainDecision<{ source: FederationMatch; sourceRef: BracketSource }> {
  const ref = side === "home" ? dependent.homeSource : dependent.awaySource;
  if (!ref) return { ok: false, reason: "HOLD: bracket source missing" };
  if (ref.side !== side || ref.matchId === dependent.id) return { ok: false, reason: "HOLD: invalid/self bracket source" };
  const candidates = matches.filter(m => m.id === ref.matchId &&
    m.federationId === dependent.federationId && m.tournamentId === dependent.tournamentId);
  if (candidates.length !== 1) return { ok: false, reason: "HOLD: missing or ambiguous source" };
  if (candidates[0].status !== "OFFICIAL") return { ok: false, reason: "HOLD: source is not OFFICIAL" };
  return { ok: true, value: { source: candidates[0], sourceRef: ref } };
}

export function bracketDependenciesReady(match: FederationMatch): DomainDecision<true> {
  if (match.homeSource && !match.homeTeamId) return { ok: false, reason: "HOLD: home dependency unresolved" };
  if (match.awaySource && !match.awayTeamId) return { ok: false, reason: "HOLD: away dependency unresolved" };
  return { ok: true, value: true };
}
