export function liveSessionRoot(sessionId: string): string {
  return `liveSessions/${sessionId}`;
}

export function liveMetaPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/meta`;
}

export function liveFieldLayoutModePath(sessionId: string): string {
  return `${liveMetaPath(sessionId)}/fieldLayoutMode`;
}

export function livePlayerPath(sessionId: string, uid: string): string {
  return `${liveSessionRoot(sessionId)}/players/${uid}`;
}

export function livePlayersPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/players`;
}

export function liveBallPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/ball`;
}

export function liveMatchPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/match`;
}

/** 게스트 → 호스트 카운트다운 트리거 (로비 allReady 시) */
export function liveCountdownSignalPath(sessionId: string): string {
  return `${liveSessionRoot(sessionId)}/signals/startCountdown`;
}

export function liveParticipantPath(sessionId: string, uid: string): string {
  return `${liveSessionRoot(sessionId)}/meta/participantUids/${uid}`;
}
