/** J2-1c — Parent Level Up celebration dismiss (localStorage only) */

const STORAGE_PREFIX = "yago_levelup_seen_";

export function levelUpCelebrationDismissKey(playerId: string, level: number): string {
  return `${STORAGE_PREFIX}${playerId}_${level}`;
}

export function hasSeenLevelUpCelebration(playerId: string, level: number): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    return window.localStorage.getItem(levelUpCelebrationDismissKey(playerId, level)) === "1";
  } catch {
    return true;
  }
}

export function markLevelUpCelebrationSeen(playerId: string, level: number): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(levelUpCelebrationDismissKey(playerId, level), "1");
  } catch {
    // quota / private mode
  }
}
