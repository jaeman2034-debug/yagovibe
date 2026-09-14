import type { FederationMatch } from "./federationMatchOps";

function segment(value: string): string {
  if (!value || value === "." || value === ".." || value.includes("/")) {
    throw new Error("Invalid canonical MatchOps path segment");
  }
  return value;
}

export function federationMatchCollectionPath(federationId: string, tournamentId: string): string {
  return `federations/${segment(federationId)}/tournaments/${segment(tournamentId)}/matches`;
}

export function federationMatchDocPath(federationId: string, tournamentId: string, matchId: string): string {
  return `${federationMatchCollectionPath(federationId, tournamentId)}/${segment(matchId)}`;
}

export function parseFederationMatch(id: string, raw: Record<string, unknown>): FederationMatch | null {
  if (typeof raw.federationId !== "string" || typeof raw.tournamentId !== "string" ||
      typeof raw.status !== "string" || !MATCH_STATUSES.has(raw.status)) return null;
  const score = (value: unknown) => value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0);
  if (!score(raw.homeScore) || !score(raw.awayScore)) return null;
  return {
    id, federationId: raw.federationId, tournamentId: raw.tournamentId,
    status: raw.status as FederationMatch["status"],
    homeScore: raw.homeScore as number | null, awayScore: raw.awayScore as number | null,
    homeTeamId: typeof raw.homeTeamId === "string" ? raw.homeTeamId : null,
    awayTeamId: typeof raw.awayTeamId === "string" ? raw.awayTeamId : null,
    homeTeamName: typeof raw.homeTeamName === "string" ? raw.homeTeamName : undefined,
    awayTeamName: typeof raw.awayTeamName === "string" ? raw.awayTeamName : undefined,
    scheduledAt: typeof raw.scheduledAt === "string" ? raw.scheduledAt : undefined,
  };
}

const MATCH_STATUSES = new Set<string>([
  "SCHEDULED", "READY", "LIVE", "FIRST_HALF", "HALFTIME", "SECOND_HALF", "FINISHED",
  "REVIEW_REQUIRED", "CONFIRMED", "OFFICIAL", "POSTPONED", "SUSPENDED", "CANCELLED", "FORFEITED",
]);
