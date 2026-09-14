import type { ExactParticipant, FederationMatch, MatchSide } from "../shared/federation/matchOps/federationMatchOps";
import { bracketDependenciesReady, inspectBracketDependency } from "../shared/federation/matchOps/federationMatchBracketDependency";
import { inspectBracketChronology } from "../shared/federation/matchOps/federationMatchBracketChronology";
import { resolveMatchWinner } from "../shared/federation/matchOps/federationMatchWinnerResolution";

type Raw = Record<string, unknown>;
type MatchRow = Raw & { id: string };
type Match = FederationMatch & { confirmationKey?: string; nextMatchId?: string };
export type BracketInput = {
  federationId: string;
  tournamentId: string;
  matchId: string;
  before: Raw | null;
  after: Raw | null;
};
export type BracketTransaction = {
  getSource(): Promise<Raw | null>;
  getMatches(): Promise<MatchRow[]>;
  getTarget(id: string): Promise<Raw | null>;
  getParticipant(id: string): Promise<Raw | null>;
  getOfficialAudit(id: string): Promise<Raw | null>;
  getBracketAudit(targetId: string, id: string): Promise<Raw | null>;
  updateTarget(targetId: string, patch: Raw): void;
  createBracketAudit(targetId: string, id: string, audit: Raw): void;
};
export type BracketPorts = {
  runTransaction<T>(body: (tx: BracketTransaction) => Promise<T>): Promise<T>;
};
export type BracketResult = {
  outcome: "SKIPPED" | "NO_TARGET" | "HOLD" | "NO_OP" | "PROPAGATED";
  reason?: string;
  targetId?: string;
  auditId?: string;
};

const hold = (reason: string): BracketResult => ({ outcome: "HOLD", reason });
const asMatch = (row: MatchRow): Match => ({ ...row, id: row.id }) as Match;
const participant = (id: string, raw: Raw | null): ExactParticipant | null => {
  if (!raw || raw.active === false) return null;
  return {
    id,
    linkStatus: raw.linkStatus === "EXACT_LINKED" ? "EXACT_LINKED" : "DISPLAY_ONLY",
    federationTeamId: typeof raw.federationTeamId === "string" ? raw.federationTeamId : "",
    platformTeamId: typeof raw.platformTeamId === "string" ? raw.platformTeamId : "",
  };
};

/** A canonical dependent must identify one source and one side by ID, never by team name. */
export function selectBracketTarget(source: Match, matches: readonly Match[]): {
  target: Match;
  side: MatchSide;
} | BracketResult {
  const candidates: Array<{ target: Match; side: MatchSide }> = [];
  for (const target of matches) {
    if (target.federationId !== source.federationId || target.tournamentId !== source.tournamentId) continue;
    for (const side of ["home", "away"] as const) {
      const ref = side === "home" ? target.homeSource : target.awaySource;
      if (ref?.matchId !== source.id) continue;
      if (ref.side !== side || ref.outcome !== "WINNER") return hold("invalid bracket slot reference");
      candidates.push({ target, side });
    }
  }
  if (candidates.length > 1) return hold("ambiguous dependent bracket slot");
  if (!candidates.length) return source.nextMatchId ?
    hold("nextMatchId has no exact dependent slot") : { outcome: "NO_TARGET" };
  if (source.nextMatchId && source.nextMatchId !== candidates[0].target.id) {
    return hold("nextMatchId conflicts with dependent source");
  }
  return candidates[0];
}

export async function propagateFederationOfficialBracketCore(
  input: BracketInput,
  ports: BracketPorts,
): Promise<BracketResult> {
  if (input.before?.status === "OFFICIAL" || input.after?.status !== "OFFICIAL") {
    return { outcome: "SKIPPED" };
  }
  const key = input.after.confirmationKey;
  if (typeof key !== "string" || !/^official_v1_[a-f0-9]{64}$/.test(key)) {
    return hold("server confirmation key missing");
  }
  return ports.runTransaction(async tx => {
    const sourceRaw = await tx.getSource();
    if (!sourceRaw || sourceRaw.status !== "OFFICIAL" || sourceRaw.confirmationKey !== key ||
        sourceRaw.federationId !== input.federationId || sourceRaw.tournamentId !== input.tournamentId) {
      return hold("canonical source changed or missing");
    }
    const source = asMatch({ ...sourceRaw, id: input.matchId });
    const rows = await tx.getMatches();
    const matches = rows.map(asMatch);
    if (matches.filter(m => m.id === source.id).length !== 1) return hold("ambiguous source match");
    const selected = selectBracketTarget(source, matches);
    if ("outcome" in selected) return selected;
    const { target, side } = selected;
    const targetRaw = await tx.getTarget(target.id);
    if (!targetRaw || targetRaw.federationId !== input.federationId ||
        targetRaw.tournamentId !== input.tournamentId) return hold("canonical target missing");
    const currentTarget = asMatch({ ...targetRaw, id: target.id });
    const dependency = inspectBracketDependency(currentTarget, side, matches);
    if (dependency.ok === false) return hold(dependency.reason);
    const chronology = inspectBracketChronology(currentTarget, matches);
    if (chronology.ok === false) return hold(chronology.reason);
    const upstream = bracketDependenciesReady(source);
    if (upstream.ok === false) return hold(upstream.reason);
    const officialAudit = await tx.getOfficialAudit(`RESULT_OFFICIAL_${key}`);
    if (officialAudit?.action !== "RESULT_OFFICIAL" ||
        officialAudit.confirmationKey !== key ||
        officialAudit.sourceMatchId !== source.id) return hold("server OFFICIAL audit missing");
    const home = source.homeTeamId ?
      participant(source.homeTeamId, await tx.getParticipant(source.homeTeamId)) : null;
    const away = source.awayTeamId ?
      participant(source.awayTeamId, await tx.getParticipant(source.awayTeamId)) : null;
    const winner = resolveMatchWinner(source, home, away);
    if (winner.ok === false) return hold(winner.reason);
    const winnerId = winner.value.participant.id;
    const slot = side === "home" ? "homeTeamId" : "awayTeamId";
    const current = targetRaw[slot];
    const auditId = `BRACKET_PROPAGATED_${key}_${target.id}_${side}`;
    const existingAudit = await tx.getBracketAudit(target.id, auditId);
    if (current === winnerId) {
      if (existingAudit && existingAudit.winnerParticipantId !== winnerId) {
        return hold("bracket audit conflicts with target slot");
      }
      return { outcome: "NO_OP", targetId: target.id, auditId };
    }
    if (current !== null && current !== undefined && current !== "") {
      const conflictId = `BRACKET_CONFLICT_${key}_${target.id}_${side}`;
      const existingConflict = await tx.getBracketAudit(target.id, conflictId);
      if (!existingConflict) {
        tx.createBracketAudit(target.id, conflictId, {
          action: "BRACKET_CONFLICT", sourceMatchId: source.id, targetMatchId: target.id,
          targetSlot: side, winnerParticipantId: winnerId, occupiedParticipantId: current,
          sourceConfirmationKey: key, createdAt: new Date().toISOString(),
        });
      }
      return { outcome: "HOLD", reason: "target slot occupied by different participant",
        targetId: target.id, auditId: conflictId };
    }
    if (targetRaw.status === "OFFICIAL" || existingAudit) {
      return hold("target OFFICIAL or propagation audit already exists");
    }
    tx.updateTarget(target.id, { [slot]: winnerId });
    tx.createBracketAudit(target.id, auditId, {
      action: "BRACKET_PROPAGATED", sourceMatchId: source.id, targetMatchId: target.id,
      targetSlot: side, winnerParticipantId: winnerId, sourceConfirmationKey: key,
      createdAt: new Date().toISOString(),
    });
    return { outcome: "PROPAGATED", targetId: target.id, auditId };
  });
}
