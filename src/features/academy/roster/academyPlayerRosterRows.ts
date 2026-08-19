import type { AcademyPlayerRow } from "@/lib/team/academyPlayersTypes";
import type { TeamMemberRow } from "@/lib/team/teamMemberRead";

/** Map academyPlayers docs to roster table rows (role=player display). */
export function academyPlayersToRosterRows(players: AcademyPlayerRow[]): TeamMemberRow[] {
  return players.map((p) => ({
    memberDocumentId: p.playerId,
    linkedAuthUid: undefined,
    billingUid: p.playerId,
    role: "player",
    status: "active",
    displayName: p.displayName,
    photoUrl: undefined,
    joinedAt: undefined,
    raw: {
      academyPlayer: true,
      birthDate: p.birthDate,
      uniformNumber: p.uniformNumber,
      position: p.position,
    },
  }));
}
