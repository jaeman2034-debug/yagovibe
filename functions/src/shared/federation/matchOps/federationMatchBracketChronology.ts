import type { DomainDecision, FederationMatch } from "./federationMatchOps";

export function inspectBracketChronology(
  dependent: FederationMatch,
  matches: readonly FederationMatch[],
): DomainDecision<true> {
  const scoped = matches.filter(m => m.federationId === dependent.federationId &&
    m.tournamentId === dependent.tournamentId);
  const byId = new Map<string, FederationMatch>();
  for (const match of scoped) {
    if (byId.has(match.id)) return { ok: false, reason: "HOLD: ambiguous bracket match ID" };
    byId.set(match.id, match);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(match: FederationMatch): boolean {
    if (visiting.has(match.id)) return false;
    if (visited.has(match.id)) return true;
    visiting.add(match.id);
    for (const ref of [match.homeSource, match.awaySource]) {
      if (!ref) continue;
      const upstream = byId.get(ref.matchId);
      if (!upstream || !visit(upstream)) return false;
      if (upstream.scheduledAt && match.scheduledAt &&
          Date.parse(upstream.scheduledAt) >= Date.parse(match.scheduledAt)) return false;
    }
    visiting.delete(match.id);
    visited.add(match.id);
    return true;
  }
  return visit(dependent) ? { ok: true, value: true } :
    { ok: false, reason: "HOLD: cyclic, missing or invalid bracket chronology" };
}
