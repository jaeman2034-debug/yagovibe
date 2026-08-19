import type { MatchmakingMode } from "@/lib/matchmaking/types";

export type TeamId = "A" | "B";

export type TeamMatchPhase = "lobby" | "countdown" | "playing" | "goal" | "ended" | "waiting";

export type TeamPlayerState = {
  uid: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: TeamId;
  ready: boolean;
  connected: boolean;
  lastSeen: number;
};

export type TeamBallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerUid: string | null;
};

export type TeamScoreState = {
  teamA: number;
  teamB: number;
};

export type TeamMatchMetaState = {
  phase: TeamMatchPhase;
  hostUid: string;
  mode: MatchmakingMode;
  playerUids: string[];
  startedAt: number;
};

export type TeamMatchSnapshot = {
  players: Record<string, TeamPlayerState>;
  ball: TeamBallState;
  score: TeamScoreState;
  meta: TeamMatchMetaState;
};

export const TEAM_MATCH_TIMING = {
  syncIntervalMs: 70,
  matchDurationMs: 90_000,
} as const;

export function sortTeamPlayerUids(uids: string[]): string[] {
  return [...new Set(uids.map((u) => u.trim()).filter(Boolean))].sort();
}

export function pickTeamHostUid(uids: string[]): string {
  const sorted = sortTeamPlayerUids(uids);
  return sorted[0] ?? "";
}

export function playersRequiredForTeamMode(mode: MatchmakingMode): number {
  return mode === "8v8" ? 16 : 10;
}
