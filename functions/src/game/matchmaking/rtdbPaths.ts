import type { MatchmakingMode } from "./constants";

export function queueMetaPath(mode: MatchmakingMode): string {
  return `matchmaking/queues/${mode}/meta`;
}

export function queueEntryPath(mode: MatchmakingMode, uid: string): string {
  return `matchmaking/queues/${mode}/entries/${uid}`;
}

export function queueEntriesPath(mode: MatchmakingMode): string {
  return `matchmaking/queues/${mode}/entries`;
}

export function formationLockPath(mode: MatchmakingMode): string {
  return `matchmaking/queues/${mode}/formationLock`;
}

export function matchPath(matchId: string): string {
  return `matchmaking/matches/${matchId}`;
}

export function presencePath(uid: string): string {
  return `presence/${uid}`;
}
