/**
 * TRACK 2 Phase 2A P2 — INTERCEPTION, BALL_LOST, OUT_OF_PLAY (host authoritative).
 */
import type { LiveFieldLayout } from "@/lib/live/liveFieldLayout";
import { getLandscapeGoals, getPortraitGoals } from "@/lib/live/liveFieldLayout";
import { BALL_RADIUS, PLAYER_BALL_DRIBBLE_DIST } from "@/lib/physics/physicsConstants";
import type { BallLossReason, MatchTeamSide, OutOfPlayRestart, OutOfPlaySide, Vec2 } from "./matchEventTypes";
import {
  emitBallLostTelemetry,
  emitInterceptionTelemetry,
  emitOutOfPlayTelemetry,
  getMatchClockMs,
  type MatchTelemetrySession,
} from "./matchTelemetryHost";
import {
  buildPassPlayersFromTeamBridge,
  clearPendingPass,
  getPendingPassForInterception,
  normalizePitchCoord,
  tryResolvePassCompleteOnBallTick,
  type PassKickPlayer,
} from "./passTelemetry";

export const POSSESSION_TOUCH_RADIUS = PLAYER_BALL_DRIBBLE_DIST + 10;
export const BALL_LOST_COOLDOWN_MS = 450;
export const OUT_OF_PLAY_COOLDOWN_MS = 900;
export const INTERCEPTION_COOLDOWN_MS = 400;

type BallPoint = { x: number; y: number };

type PossessionTickState = {
  teamId: MatchTeamSide | null;
  actorUid: string | null;
  lastBallLostAt: number;
  lastOutOfPlayAt: number;
  lastInterceptionAt: number;
};

const possessionBySession = new Map<string, PossessionTickState>();

function possessionState(sessionId: string): PossessionTickState {
  const sid = sessionId.trim();
  let s = possessionBySession.get(sid);
  if (!s) {
    s = {
      teamId: null,
      actorUid: null,
      lastBallLostAt: 0,
      lastOutOfPlayAt: 0,
      lastInterceptionAt: 0,
    };
    possessionBySession.set(sid, s);
  }
  return s;
}

export function resetPossessionTelemetrySession(sessionId: string): void {
  possessionBySession.delete(sessionId.trim());
}

function closestPlayer(
  ballX: number,
  ballY: number,
  players: PassKickPlayer[],
): { uid: string; team: MatchTeamSide; dist: number } | null {
  let best: { uid: string; team: MatchTeamSide; dist: number } | null = null;
  for (const p of players) {
    const dist = Math.hypot(ballX - p.x, ballY - p.y);
    if (!best || dist < best.dist) {
      best = { uid: p.uid, team: p.team, dist };
    }
  }
  return best;
}

function inGoalMouth(ballX: number, ballY: number, field: LiveFieldLayout): boolean {
  const r = BALL_RADIUS * 0.5;
  if (field.mode === "portrait") {
    const pg = getPortraitGoals(field);
    const inMouthX = Math.abs(ballX - pg.centerX) <= pg.halfMouth + r;
    return inMouthX && (ballY <= pg.topLineY + BALL_RADIUS || ballY >= pg.bottomLineY - BALL_RADIUS);
  }
  const lg = getLandscapeGoals(field);
  const inMouthY = Math.abs(ballY - lg.centerY) <= lg.halfMouth + r;
  return inMouthY && (ballX <= lg.leftLineX + BALL_RADIUS || ballX >= lg.rightLineX - BALL_RADIUS);
}

function detectOutOfPlayCrossing(
  prev: BallPoint,
  curr: BallPoint,
  field: LiveFieldLayout,
): { side: OutOfPlaySide; restartType: OutOfPlayRestart } | null {
  const margin = field.margin + BALL_RADIUS;
  const minX = margin;
  const minY = margin;
  const maxX = field.w - margin;
  const maxY = field.h - margin;

  if (inGoalMouth(curr.x, curr.y, field) || inGoalMouth(prev.x, prev.y, field)) {
    return null;
  }

  if (field.mode === "portrait") {
    const pg = getPortraitGoals(field);
    const inTopMouth = Math.abs(curr.x - pg.centerX) <= pg.halfMouth;
    const inBotMouth = Math.abs(curr.x - pg.centerX) <= pg.halfMouth;
    if (prev.y >= minY && curr.y < minY && !inTopMouth) {
      return { side: "top", restartType: "throw_in" };
    }
    if (prev.y <= maxY && curr.y > maxY && !inBotMouth) {
      return { side: "bottom", restartType: "throw_in" };
    }
    if (prev.x >= minX && curr.x < minX) return { side: "left", restartType: "throw_in" };
    if (prev.x <= maxX && curr.x > maxX) return { side: "right", restartType: "throw_in" };
    return null;
  }

  const lg = getLandscapeGoals(field);
  const inLeftMouth = Math.abs(curr.y - lg.centerY) <= lg.halfMouth;
  const inRightMouth = Math.abs(curr.y - lg.centerY) <= lg.halfMouth;
  if (prev.x >= minX && curr.x < minX && !inLeftMouth) {
    return { side: "left", restartType: "throw_in" };
  }
  if (prev.x <= maxX && curr.x > maxX && !inRightMouth) {
    return { side: "right", restartType: "throw_in" };
  }
  if (prev.y >= minY && curr.y < minY) return { side: "top", restartType: "throw_in" };
  if (prev.y <= maxY && curr.y > maxY) return { side: "bottom", restartType: "throw_in" };
  return null;
}

function tryEmitBallLost(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    reason: BallLossReason;
    teamId: MatchTeamSide;
    lastTouchUid?: string;
    ball: Vec2;
    clockMs: number;
    sessionId: string;
  },
): void {
  const st = possessionState(args.sessionId);
  const now = Date.now();
  if (now - st.lastBallLostAt < BALL_LOST_COOLDOWN_MS) return;
  st.lastBallLostAt = now;

  emitBallLostTelemetry(bridge, {
    reason: args.reason,
    teamId: args.teamId,
    lastTouchUid: args.lastTouchUid,
    ball: args.ball,
    clockMs: args.clockMs,
    actorUid: args.lastTouchUid,
  });
}

function tryEmitOutOfPlay(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    side: OutOfPlaySide;
    restartType: OutOfPlayRestart;
    ball: Vec2;
    clockMs: number;
    sessionId: string;
  },
): void {
  const st = possessionState(args.sessionId);
  const now = Date.now();
  if (now - st.lastOutOfPlayAt < OUT_OF_PLAY_COOLDOWN_MS) return;
  st.lastOutOfPlayAt = now;
  st.teamId = null;
  st.actorUid = null;

  emitOutOfPlayTelemetry(bridge, {
    side: args.side,
    restartType: args.restartType,
    ball: args.ball,
    clockMs: args.clockMs,
  });
}

function tryEmitInterception(
  bridge: { telemetrySession?: MatchTelemetrySession },
  args: {
    interceptorUid: string;
    teamId: MatchTeamSide;
    fromUid?: string;
    ball: Vec2;
    clockMs: number;
    sessionId: string;
    passId?: string;
  },
): void {
  const st = possessionState(args.sessionId);
  const now = Date.now();
  if (now - st.lastInterceptionAt < INTERCEPTION_COOLDOWN_MS) return;
  st.lastInterceptionAt = now;

  emitInterceptionTelemetry(bridge, {
    interceptorUid: args.interceptorUid,
    teamId: args.teamId,
    fromUid: args.fromUid,
    ball: args.ball,
    clockMs: args.clockMs,
    passId: args.passId,
  });
}

function tryResolveInterceptionOnPendingPass(
  bridge: { telemetrySession?: MatchTelemetrySession; sessionId: string },
  ballX: number,
  ballY: number,
  players: PassKickPlayer[],
  field: LiveFieldLayout,
): void {
  const sessionId = bridge.sessionId.trim();
  if (!sessionId || !bridge.telemetrySession) return;

  const pending = getPendingPassForInterception(sessionId);
  if (!pending) return;

  const receiver = players.find((p) => p.uid === pending.targetUid);
  if (!receiver || receiver.team !== pending.teamId) {
    clearPendingPass(sessionId);
    return;
  }

  const recvDist = Math.hypot(ballX - receiver.x, ballY - receiver.y);
  const receiveRadius = PLAYER_BALL_DRIBBLE_DIST + 12;

  let interceptor: PassKickPlayer | null = null;
  let bestOppDist = Infinity;
  for (const p of players) {
    if (p.team === pending.teamId) continue;
    const oppDist = Math.hypot(ballX - p.x, ballY - p.y);
    if (oppDist <= receiveRadius && oppDist < recvDist - 4 && oppDist < bestOppDist) {
      interceptor = p;
      bestOppDist = oppDist;
    }
  }

  if (!interceptor) return;

  const clockMs = getMatchClockMs(bridge);
  tryEmitInterception(bridge, {
    interceptorUid: interceptor.uid,
    teamId: interceptor.team,
    fromUid: pending.fromUid,
    ball: normalizePitchCoord(ballX, ballY, field),
    clockMs,
    sessionId,
    passId: pending.passId,
  });
  clearPendingPass(sessionId);

  const st = possessionState(sessionId);
  st.teamId = interceptor.team;
  st.actorUid = interceptor.uid;
}

/**
 * Host tick — interception → pass complete → out of play → ball lost.
 */
export function tickTeamMatchPossessionTelemetry(
  bridge: { telemetrySession?: MatchTelemetrySession; sessionId: string },
  ballBefore: BallPoint,
  ballAfter: BallPoint,
  players: PassKickPlayer[],
  field: LiveFieldLayout,
): void {
  const sessionId = bridge.sessionId.trim();
  if (!sessionId || !bridge.telemetrySession) return;

  tryResolveInterceptionOnPendingPass(bridge, ballAfter.x, ballAfter.y, players, field);
  tryResolvePassCompleteOnBallTick(bridge, ballAfter.x, ballAfter.y, players, field);

  const oop = detectOutOfPlayCrossing(ballBefore, ballAfter, field);
  if (oop) {
    const clockMs = getMatchClockMs(bridge);
    tryEmitOutOfPlay(bridge, {
      side: oop.side,
      restartType: oop.restartType,
      ball: normalizePitchCoord(ballAfter.x, ballAfter.y, field),
      clockMs,
      sessionId,
    });
    return;
  }

  const near = closestPlayer(ballAfter.x, ballAfter.y, players);
  if (!near || near.dist > POSSESSION_TOUCH_RADIUS) return;

  const st = possessionState(sessionId);
  const clockMs = getMatchClockMs(bridge);
  const ballNorm = normalizePitchCoord(ballAfter.x, ballAfter.y, field);

  if (st.teamId && st.teamId !== near.team) {
    tryEmitBallLost(bridge, {
      reason: "dispossessed",
      teamId: st.teamId,
      lastTouchUid: st.actorUid ?? undefined,
      ball: ballNorm,
      clockMs,
      sessionId,
    });
  }

  st.teamId = near.team;
  st.actorUid = near.uid;
}

export { buildPassPlayersFromTeamBridge };
