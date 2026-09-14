import { createHash } from "node:crypto";
import type { ExactParticipant, FederationMatch, FederationMatchEvent } from "../shared/federation/matchOps/federationMatchOps";
import { assessOfficialReadiness } from "../shared/federation/matchOps/federationMatchOpsConsistency";

type Request = { federationId: string; tournamentId: string; matchId: string; actorUid: string };
type Raw = Record<string, unknown>;
export type OfficialTransaction = {
  getFederation(): Promise<Raw | null>;
  getMatch(): Promise<Raw | null>;
  getEvents(): Promise<Raw[]>;
  getParticipant(id: string): Promise<Raw | null>;
  getTournamentMatches(): Promise<Raw[]>;
  getAudit(id: string): Promise<Raw | null>;
  updateMatch(patch: Raw): void;
  createAudit(id: string, audit: Raw): void;
};
export type OfficialPorts = { runTransaction<T>(body: (tx: OfficialTransaction) => Promise<T>): Promise<T> };

export class OfficialError extends Error {
  constructor(public readonly code: "unauthenticated" | "permission-denied" | "not-found" | "failed-precondition" | "already-exists", message: string) {
    super(message);
  }
}

function publisher(federation: Raw, uid: string): boolean {
  const roles = federation.roles && typeof federation.roles === "object" ? federation.roles as Raw : {};
  const contains = (value: unknown) => Array.isArray(value) && value.includes(uid);
  return federation.ownerUid === uid || federation.ownerId === uid ||
    contains(federation.adminUids) || contains(federation.adminIds) ||
    contains(roles.admins) || contains(roles.editors);
}

function participant(id: string, raw: Raw | null): ExactParticipant | null {
  if (!raw || raw.active === false) return null;
  return {
    id,
    federationTeamId: typeof raw.federationTeamId === "string" ? raw.federationTeamId : "",
    platformTeamId: typeof raw.platformTeamId === "string" ? raw.platformTeamId : "",
    linkStatus: raw.linkStatus === "EXACT_LINKED" ? "EXACT_LINKED" : "DISPLAY_ONLY",
  };
}

function canonicalMatch(id: string, raw: Raw): FederationMatch {
  return { ...raw, id } as FederationMatch;
}

function resultKey(request: Request, match: FederationMatch, events: FederationMatchEvent[]): string {
  const confirmed = events.filter(e => e.status === "CONFIRMED" || e.status === "VOID")
    .map(e => [e.id, e.type, e.teamSide ?? null, e.status]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const result = [request.federationId, request.tournamentId, request.matchId,
    match.homeTeamId, match.awayTeamId, match.homeScore, match.awayScore, confirmed];
  return `official_v1_${createHash("sha256").update(JSON.stringify(result)).digest("hex")}`;
}

export async function confirmFederationMatchOfficialCore(request: Request, ports: OfficialPorts) {
  if (!request.actorUid) throw new OfficialError("unauthenticated", "Authentication required");
  return ports.runTransaction(async tx => {
    const federation = await tx.getFederation();
    if (!federation || !publisher(federation, request.actorUid)) {
      throw new OfficialError("permission-denied", "Federation publisher required");
    }
    const raw = await tx.getMatch();
    if (!raw) throw new OfficialError("not-found", "Canonical match not found");
    if (raw.federationId !== request.federationId || raw.tournamentId !== request.tournamentId) {
      throw new OfficialError("failed-precondition", "Match scope conflict");
    }
    const match = canonicalMatch(request.matchId, raw);
    // Read all events, participants, upstream matches and the deterministic audit before any write.
    const events = (await tx.getEvents()).map((e, i) => ({ ...e, id: String(e.id ?? `missing-${i}`) })) as FederationMatchEvent[];
    if (events.some(e => e.id.startsWith("missing-"))) {
      throw new OfficialError("failed-precondition", "Event ID missing");
    }
    const home = match.homeTeamId ? participant(match.homeTeamId, await tx.getParticipant(match.homeTeamId)) : null;
    const away = match.awayTeamId ? participant(match.awayTeamId, await tx.getParticipant(match.awayTeamId)) : null;
    const sources = (await tx.getTournamentMatches()).map(m => canonicalMatch(String(m.id ?? ""), m));
    const key = resultKey(request, match, events);
    const auditId = `RESULT_OFFICIAL_${key}`;
    const existingAudit = await tx.getAudit(auditId);
    if (match.status === "OFFICIAL") {
      if (raw.confirmationKey === key && existingAudit?.confirmationKey === key) {
        return { outcome: "NO_OP", confirmationKey: key, auditId };
      }
      throw new OfficialError("already-exists", "OFFICIAL result conflict");
    }
    if (existingAudit) throw new OfficialError("already-exists", "Confirmation audit conflict");
    const readiness = assessOfficialReadiness(match, events, home, away, sources);
    if (readiness.ok === false) throw new OfficialError("failed-precondition", readiness.reason);
    const createdAt = new Date().toISOString();
    tx.updateMatch({ status: "OFFICIAL", officialAt: createdAt, officialBy: request.actorUid, confirmationKey: key });
    tx.createAudit(auditId, {
      action: "RESULT_OFFICIAL", actorUid: request.actorUid,
      sourceMatchId: request.matchId, confirmationKey: key,
      result: { homeScore: match.homeScore, awayScore: match.awayScore,
        homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
      createdAt,
    });
    return { outcome: "OFFICIAL", confirmationKey: key, auditId };
  });
}
