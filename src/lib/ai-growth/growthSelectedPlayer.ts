import type { AcademyPlayerRow } from "@/lib/team/academyPlayersTypes";

/** Sprint C3-1 — Growth console selection bound to teams/{teamId}/academyPlayers */
export type GrowthSelectedPlayer = {
  playerId: string;
  displayName: string;
  birthDate?: string | null;
  position?: string | null;
};

export function academyRowToGrowthPlayer(row: AcademyPlayerRow): GrowthSelectedPlayer {
  return {
    playerId: row.playerId,
    displayName: row.displayName,
    birthDate: row.birthDate,
    position: row.position,
  };
}

export function growthPlayerSelectLabel(p: GrowthSelectedPlayer): string {
  const parts = [p.displayName];
  const year = p.birthDate?.trim().slice(0, 4);
  if (year) parts.push(`${year}년`);
  if (p.position?.trim()) parts.push(p.position.trim());
  return parts.join(" · ");
}
