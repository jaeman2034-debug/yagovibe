import type { MatchmakingMode } from "@/lib/matchmaking/types";
import type {
  BallLossReason,
  MatchMode,
  MatchTeamSide,
  OutOfPlayRestart,
  OutOfPlaySide,
} from "./matchEventTypes";
import { normalizeMatchClockMs } from "./matchClock";
import { createMatchEventEmitter, type MatchEventEmitter } from "./matchEventEmitter";
import { registerTelemetryEmitTest } from "./telemetryProdDebug";

export type MatchTelemetrySession = {
  emitter: MatchEventEmitter;
  matchId: string;
  matchStartedAt: number;
  /** endedAlready — scene shutdown + hook cleanup 중복 방지 */
  flags: { started: boolean; ended: boolean };
};

export function getMatchClockMs(bridge: { telemetrySession?: MatchTelemetrySession }): number {
  const ts = bridge.telemetrySession;
  if (!ts) return 0;
  return normalizeMatchClockMs(Date.now() - ts.matchStartedAt, 0);
}

export function isMatchEndedEmitted(bridge: { telemetrySession?: MatchTelemetrySession }): boolean {
  return bridge.telemetrySession?.flags.ended === true;
}

export function isMatchStartedEmitted(bridge: { telemetrySession?: MatchTelemetrySession }): boolean {
  return bridge.telemetrySession?.flags.started === true;
}

export type AttachHostTelemetryArgs = {
  matchId: string;
  sessionId: string;
  mode: MatchmakingMode;
  isHost: boolean;
  startedAt?: number;
};

function toMatchMode(mode: MatchmakingMode): MatchMode {
  return mode;
}

/** Host bridge에 telemetry 세션 부착 (guest는 null) */
export function attachHostMatchTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession; hostUid?: string },
  args: AttachHostTelemetryArgs,
): MatchTelemetrySession | null {
  const matchId = args.matchId.trim();
  const sessionId = args.sessionId.trim();
  if (!args.isHost || !matchId || !sessionId) {
    console.warn("[TELEMETRY] attach skipped", {
      isHost: args.isHost,
      matchId: matchId.slice(0, 8) || "(empty)",
      sessionId: sessionId.slice(0, 8) || "(empty)",
    });
    return null;
  }

  console.info("[TELEMETRY] attach attempt", {
    matchId: matchId.slice(0, 8),
    sessionId: sessionId.slice(0, 8),
    mode: args.mode,
  });

  const matchStartedAt = args.startedAt ?? Date.now();
  const emitter = createMatchEventEmitter({
    matchId,
    sessionId,
    mode: toMatchMode(args.mode),
    isHost: () => true,
    getMatchClockMs: () => normalizeMatchClockMs(Date.now() - matchStartedAt, 0),
  });

  const session: MatchTelemetrySession = {
    emitter,
    matchId,
    matchStartedAt,
    flags: { started: false, ended: false },
  };
  bridge.telemetrySession = session;
  registerTelemetryEmitTest({
    emitter,
    sessionId,
    matchId,
    mode: toMatchMode(args.mode),
    hostUid: bridge.hostUid?.trim() || "",
  });
  console.info("[TELEMETRY] attached", { matchId: matchId.slice(0, 8), sessionId: sessionId.slice(0, 8) });
  return session;
}

export function disposeHostMatchTelemetry(bridge: { telemetrySession?: MatchTelemetrySession }): void {
  const ts = bridge.telemetrySession;
  if (!ts) return;
  void ts.emitter.flushAndDispose().then((r) => {
    if (import.meta.env.DEV) {
      console.info("[TELEMETRY] flushAndDispose", r);
    }
    bridge.telemetrySession = undefined;
    registerTelemetryEmitTest(null);
  });
}

function getEmitter(bridge: { telemetrySession?: MatchTelemetrySession }): MatchEventEmitter | null {
  return bridge.telemetrySession?.emitter ?? null;
}

export function emitMatchStartedTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    playerUids: string[];
    hostUid: string;
    startedAt: number;
    mode: MatchmakingMode;
  },
): void {
  const ts = bridge.telemetrySession;
  const emitter = getEmitter(bridge);
  if (!ts || !emitter || ts.flags.started) return;

  ts.flags.started = true;
  ts.matchStartedAt =
    typeof args.startedAt === "number" && Number.isFinite(args.startedAt)
      ? args.startedAt
      : Date.now();
  const atMs = 0;
  emitter.emitMatchEvent({
    type: "MATCH_STARTED",
    atMs,
    wallTime: Date.now(),
    payload: {
      mode: args.mode,
      playerUids: args.playerUids,
      startedAt: args.startedAt,
      hostUid: args.hostUid,
    },
  });
}

export function emitKickAttemptTelemetry(
  bridge: {
    telemetrySession?: MatchTelemetrySession;
    mode?: MatchmakingMode;
  },
  args: {
    playerUid: string;
    teamId: MatchTeamSide;
    ballX: number;
    ballY: number;
    directionX: number;
    directionY: number;
    power: number;
    distanceToBall: number;
    mode?: MatchmakingMode;
    clockMs?: number;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) {
    console.warn("[TELEMETRY] kick emit skipped — no emitter on bridge");
    return;
  }

  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);
  const mode = args.mode ?? bridge.mode ?? "5v5";

  emitter.emitMatchEvent({
    type: "KICK_ATTEMPT",
    actorUid: args.playerUid,
    teamId: args.teamId,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      playerUid: args.playerUid,
      teamId: args.teamId,
      ballX: args.ballX,
      ballY: args.ballY,
      power: args.power,
      distanceToBall: args.distanceToBall,
      directionX: args.directionX,
      directionY: args.directionY,
      clockMs,
      mode,
    },
  });
}

export function emitGoalTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    scoringTeam: MatchTeamSide;
    scorerUid?: string;
    scoreBefore: { teamA: number; teamB: number };
    scoreAfter: { teamA: number; teamB: number };
    clockMs?: number;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;
  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);

  emitter.emitMatchEvent({
    type: "GOAL",
    teamId: args.scoringTeam,
    actorUid: args.scorerUid,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      scoringTeam: args.scoringTeam,
      ...(args.scorerUid ? { scorerUid: args.scorerUid } : {}),
      scoreBefore: args.scoreBefore,
      scoreAfter: args.scoreAfter,
      clockMs,
    },
  });
}

export function emitMatchEndedTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    finalScore: { teamA: number; teamB: number };
    winner?: MatchTeamSide | "draw";
    durationMs?: number;
  },
): void {
  const ts = bridge.telemetrySession;
  const emitter = getEmitter(bridge);
  if (!ts || !emitter) return;

  /** endedAlready — shutdown + unmount 이중 emit 방지 */
  if (ts.flags.ended) return;

  ts.flags.ended = true;
  const duration =
    args.durationMs ?? Math.max(0, Date.now() - ts.matchStartedAt);
  const winner =
    args.winner ??
    (args.finalScore.teamA > args.finalScore.teamB
      ? "A"
      : args.finalScore.teamB > args.finalScore.teamA
        ? "B"
        : "draw");

  const atMs = normalizeMatchClockMs(getMatchClockMs(bridge), 0);
  emitter.emitMatchEvent({
    type: "MATCH_ENDED",
    atMs,
    wallTime: Date.now(),
    payload: {
      winner,
      finalScore: args.finalScore,
      durationMs: duration,
    },
  });
  void emitter.flushMatchEvents();
}

export function emitPassAttemptTelemetry(
  bridge: {
    telemetrySession?: MatchTelemetrySession;
    mode?: MatchmakingMode;
  },
  args: {
    fromUid: string;
    teamId: MatchTeamSide;
    ball: { x: number; y: number };
    dirX: number;
    dirY: number;
    clockMs?: number;
    targetUid?: string;
    passId?: string;
    to?: { x: number; y: number };
    mode?: MatchmakingMode;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;

  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);
  const mode = args.mode ?? bridge.mode ?? "5v5";
  const dirLen = Math.hypot(args.dirX, args.dirY) || 1;

  emitter.emitMatchEvent({
    type: "PASS_ATTEMPT",
    actorUid: args.fromUid,
    teamId: args.teamId,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      fromUid: args.fromUid,
      teamId: args.teamId,
      ball: args.ball,
      dirX: args.dirX / dirLen,
      dirY: args.dirY / dirLen,
      clockMs,
      ...(args.targetUid ? { targetUid: args.targetUid } : {}),
      ...(args.passId ? { passId: args.passId } : {}),
      ...(args.to ? { to: args.to } : {}),
    },
  });
}

export function emitPassCompleteTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    fromUid: string;
    toUid: string;
    teamId: MatchTeamSide;
    passId?: string;
    from?: { x: number; y: number };
    to?: { x: number; y: number };
    clockMs?: number;
    receivedAtMs?: number;
    chainId?: string;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;

  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);
  const receivedAtMs = normalizeMatchClockMs(args.receivedAtMs ?? clockMs, clockMs);

  emitter.emitMatchEvent({
    type: "PASS_COMPLETE",
    actorUid: args.fromUid,
    teamId: args.teamId,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      fromUid: args.fromUid,
      toUid: args.toUid,
      teamId: args.teamId,
      ...(args.passId ? { passId: args.passId } : {}),
      ...(args.from ? { from: args.from, ball: args.from } : {}),
      ...(args.to ? { to: args.to, ball: args.to } : {}),
      receivedAtMs,
      ...(args.chainId ? { chainId: args.chainId } : {}),
    },
  });
}

export function emitInterceptionTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    interceptorUid: string;
    teamId: MatchTeamSide;
    fromUid?: string;
    ball: { x: number; y: number };
    clockMs?: number;
    passId?: string;
    zoneId?: string;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;
  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);

  emitter.emitMatchEvent({
    type: "INTERCEPTION",
    actorUid: args.interceptorUid,
    teamId: args.teamId,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      interceptorUid: args.interceptorUid,
      teamId: args.teamId,
      ball: args.ball,
      ...(args.fromUid ? { fromUid: args.fromUid, passerUid: args.fromUid } : {}),
      ...(args.passId ? { passId: args.passId } : {}),
      ...(args.zoneId ? { zoneId: args.zoneId } : {}),
    },
  });
}

export function emitBallLostTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    reason: BallLossReason;
    ball: { x: number; y: number };
    teamId?: MatchTeamSide;
    lastTouchUid?: string;
    clockMs?: number;
    actorUid?: string;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;
  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);

  emitter.emitMatchEvent({
    type: "BALL_LOST",
    actorUid: args.actorUid ?? args.lastTouchUid,
    teamId: args.teamId,
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      reason: args.reason,
      ball: args.ball,
      ...(args.teamId ? { teamId: args.teamId } : {}),
      ...(args.lastTouchUid ? { lastTouchUid: args.lastTouchUid } : {}),
    },
  });
}

export function emitOutOfPlayTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    side: OutOfPlaySide;
    ball: { x: number; y: number };
    restartType?: OutOfPlayRestart;
    clockMs?: number;
  },
): void {
  const emitter = getEmitter(bridge);
  if (!emitter) return;
  const clockMs = normalizeMatchClockMs(args.clockMs ?? getMatchClockMs(bridge), 0);

  emitter.emitMatchEvent({
    type: "OUT_OF_PLAY",
    atMs: clockMs,
    wallTime: Date.now(),
    payload: {
      side: args.side,
      ball: args.ball,
      restartType: args.restartType ?? "throw_in",
    },
  });
}
