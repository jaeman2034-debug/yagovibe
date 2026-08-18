/** Sprint D-4.5 — 선수 성장 프로필 canonical path (/profile root) */
export function buildPlayerGrowthProfilePath(teamId: string, playerId: string): string {
  return `/profile/growth/${encodeURIComponent(teamId)}/${encodeURIComponent(playerId)}`;
}

/** Parent Home 퍼널 진입 경로 */
export function buildParentChildGrowthProfilePath(teamId: string, playerId: string): string {
  return `/home/parent/child/${encodeURIComponent(teamId)}/${encodeURIComponent(playerId)}`;
}
