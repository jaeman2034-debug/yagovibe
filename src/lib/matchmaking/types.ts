export type MatchmakingMode = "5v5" | "8v8";

export type MatchPlayerState = {
  uid: string;
  displayName: string;
  ready: boolean;
};

export type MatchFoundState = {
  matchId: string;
  mode: MatchmakingMode;
  status: "found" | "ready" | "starting" | "started" | "cancelled";
  players: Record<string, MatchPlayerState>;
  sessionId?: string | null;
  createdAt: number;
  expiresAt: number;
};

export type QueueEntry = {
  uid: string;
  displayName: string;
  joinedAt: number;
  expiresAt: number;
  clientId: string;
  teamId?: string | null;
  status: "waiting";
};

export type JoinQueueResponse = {
  ok: boolean;
  status: "queued" | "match_found";
  mode: MatchmakingMode;
  queuePosition?: number;
  estimatedWaitSec?: number;
  match?: MatchFoundState;
};
