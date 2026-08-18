/** Legacy name → playerId slug (한글-only names → player-unknown). */
export function playerIdFromName(playerName: string): string {
  const slug = playerName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
  return slug ? `player-${slug}` : "player-unknown";
}

export function resolveGrowthPlayerIdForSession(input: {
  playerId?: string;
  displayName: string;
}): string {
  const id = input.playerId?.trim();
  if (id) return id;
  return playerIdFromName(input.displayName);
}
