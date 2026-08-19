import {
  liveSessionRoot,
  livePlayerPath,
  livePlayersPath,
  liveBallPath,
  liveMatchPath,
} from "@/lib/live/liveMatchRtdb";

export {
  liveSessionRoot,
  livePlayerPath,
  livePlayersPath,
  liveBallPath,
  liveMatchPath,
};

export function liveKickRequestsPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/kickRequests`;
}

export function liveKickRequestPath(sessionId: string, uid: string): string {
  return `${liveKickRequestsPath(sessionId)}/${uid}`;
}

export function liveTeamScorePath(sessionId: string): string {
  return `liveSessions/${sessionId}/score`;
}

export function liveTeamPhasePath(sessionId: string): string {
  return `liveSessions/${sessionId}/phase`;
}
