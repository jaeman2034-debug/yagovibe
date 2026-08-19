import { academyPlayersToRosterRows } from "@/features/academy/roster/academyPlayerRosterRows";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { readPlayers } from "@/lib/team/teamMemberRead";
import type { TeamMemberRow } from "@/lib/team/teamMemberReadTypes";

/** C3-0 academyPlayers primary; legacy members.role=player merged without duplicate ids. */
export async function loadAcademyAttendanceMarkTargets(teamId: string): Promise<TeamMemberRow[]> {
  const [academyPlayers, legacyPlayers] = await Promise.all([
    readAcademyPlayers(teamId),
    readPlayers(teamId),
  ]);
  const academyRows = academyPlayersToRosterRows(academyPlayers);
  const seen = new Set(academyRows.map((r) => r.memberDocumentId));
  const merged = [...academyRows];
  for (const row of legacyPlayers) {
    if (seen.has(row.memberDocumentId)) continue;
    merged.push(row);
    seen.add(row.memberDocumentId);
  }
  return merged;
}

export function teamMemberRowsToDisplayNameMap(rows: TeamMemberRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.memberDocumentId, r.displayName);
    if (r.billingUid) map.set(r.billingUid, r.displayName);
    if (r.linkedAuthUid) map.set(r.linkedAuthUid, r.displayName);
  }
  return map;
}
