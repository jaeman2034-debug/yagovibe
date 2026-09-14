import { createHash } from "node:crypto";
import type { FederationMatch } from "../shared/federation/matchOps/federationMatchOps";
import {
  planCanonicalProjection, type ExistingClubProjection, type ProjectionIdentity,
} from "../shared/federation/publicProjection/canonicalProjectionContract";

export type ProjectionRow = Record<string, unknown> | null;
export type ClubRow = ExistingClubProjection & { data: Record<string, unknown> };
export type SetAInput = {
  federationId: string; tournamentId: string; matchId: string;
  match: FederationMatch | null;
  tournamentName: string | null;
  home: ProjectionIdentity; away: ProjectionIdentity;
  publicRow: ProjectionRow;
  clubRows: ClubRow[];
};
export type PlannedWrite = { path: string; patch: Record<string, unknown>; merge: true };
export type SetAPlan = { writes: PlannedWrite[]; publicVisible: boolean; clubVisibleIds: string[] };

/** Compares only fields owned by Set A. Story fields are deliberately never part of a patch. */
function differs(row: ProjectionRow, patch: Record<string, unknown>): boolean {
  if (!row) return true;
  return Object.entries(patch).some(([key, value]) => JSON.stringify(row[key]) !== JSON.stringify(value));
}

function revision(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function planSetA(input: SetAInput): SetAPlan {
  const { federationId, tournamentId, matchId, match, publicRow, clubRows } = input;
  const publicPath = `federations/${federationId}/tournaments/${tournamentId}/publicMatches/${matchId}`;
  const clubPath = `federations/${federationId}/clubMatchProjections`;
  const intent = planCanonicalProjection(matchId, null, { match, home: input.home, away: input.away }, [], clubRows);
  const visible = intent.publicMatch.publicVisible && Boolean(input.tournamentName?.trim());
  const writes: PlannedWrite[] = [];
  if (visible && match) {
    const publicPatch: Record<string, unknown> = {
      matchId, federationId, tournamentId, tournamentName: input.tournamentName!.trim(),
      publicVisible: true, publicStatus: intent.publicMatch.publicStatus,
      scheduledAt: intent.publicMatch.scheduledAt,
      homeDisplayName: intent.publicMatch.homeDisplayName,
      awayDisplayName: intent.publicMatch.awayDisplayName,
      homeParticipantId: intent.publicMatch.homeParticipantId,
      awayParticipantId: intent.publicMatch.awayParticipantId,
      homeScore: intent.publicMatch.homeScore,
      awayScore: intent.publicMatch.awayScore,
    };
    if (differs(publicRow, publicPatch)) writes.push({ path: publicPath, patch: publicPatch, merge: true });
  } else if (publicRow && publicRow.publicVisible !== false) {
    writes.push({ path: publicPath, patch: { publicVisible: false }, merge: true });
  }

  const clubVisibleIds: string[] = [];
  const participantConflict = Boolean(input.home && input.away &&
    input.home.linkStatus === "EXACT_LINKED" && input.away.linkStatus === "EXACT_LINKED" &&
    input.home.platformTeamId && input.home.platformTeamId === input.away.platformTeamId);
  if (visible && match && !participantConflict) {
    for (const [side, participant] of [["home", input.home], ["away", input.away]] as const) {
      const id = side === "home" ? match.homeTeamId : match.awayTeamId;
      if (!participant || participant.id !== id || participant.linkStatus !== "EXACT_LINKED" ||
          !participant.platformTeamId || !participant.federationTeamId) continue;
      const documentId = `${participant.platformTeamId}__${matchId}`;
      const opponent = side === "home" ? input.away : input.home;
      const opponentId = side === "home" ? match.awayTeamId : match.homeTeamId;
      const exactOpponent = opponent?.id === opponentId && opponent?.linkStatus === "EXACT_LINKED" ? opponent : null;
      const teamScore = side === "home" ? match.homeScore : match.awayScore;
      const opponentScore = side === "home" ? match.awayScore : match.homeScore;
      const result = match.status !== "OFFICIAL" || teamScore === opponentScore ? "PENDING" :
        (teamScore as number) > (opponentScore as number) ? "WIN" : "LOSS";
      const payload = {
        matchId, federationId, tournamentId, platformTeamId: participant.platformTeamId,
        federationTeamId: participant.federationTeamId, participantId: participant.id,
        opponentPlatformTeamId: exactOpponent?.platformTeamId ?? null,
        opponentFederationTeamId: exactOpponent?.federationTeamId ?? null,
        teamSide: side, tournamentName: input.tournamentName!.trim(),
        teamDisplayName: side === "home" ? match.homeTeamName : match.awayTeamName,
        opponentDisplayName: side === "home" ? match.awayTeamName : match.homeTeamName,
        teamScore, opponentScore, result,
        status: intent.publicMatch.publicStatus, matchOpsStatus: match.status,
        kickoffAt: match.scheduledAt,
        sourceMatchPath: `federations/${federationId}/tournaments/${tournamentId}/matches/${matchId}`,
        visible: true,
      };
      const patch = { ...payload, sourceRevision: revision(payload) };
      const old = clubRows.find(row => row.id === documentId);
      clubVisibleIds.push(documentId);
      if (differs(old?.data ?? null, patch)) writes.push({ path: `${clubPath}/${documentId}`, patch, merge: true });
    }
  }
  const keep = new Set(clubVisibleIds);
  for (const old of clubRows) {
    if (old.matchId === matchId && !keep.has(old.id) && old.data.visible !== false) {
      writes.push({ path: `${clubPath}/${old.id}`, patch: { visible: false }, merge: true });
    }
  }
  return { writes, publicVisible: visible, clubVisibleIds };
}
