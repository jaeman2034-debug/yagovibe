/**
 * TRACK 2 Phase 2A P1 — pass attempt/complete detection (host authoritative).
 */
import type { LiveFieldLayout } from "@/lib/live/liveFieldLayout";
import { PLAYER_BALL_DRIBBLE_DIST } from "@/lib/physics/physicsConstants";
import type { MatchTeamSide, Vec2 } from "./matchEventTypes";
import {
  emitPassAttemptTelemetry,
  emitPassCompleteTelemetry,
  getMatchClockMs,
  type MatchTelemetrySession,
} from "./matchTelemetryHost";

export const PASS_COMPLETE_TTL_MS = 4500;
export const PASS_ATTEMPT_COOLDOWN_MS = 320;
export const PASS_MIN_DIRECTION_DOT = 0.42;
export const PASS_MAX_TARGET_DIST = 520;

type PendingPass = {
  passId: string;
  fromUid: string;
  targetUid: string;
  teamId: MatchTeamSide;
  fromBall: Vec2;
  targetPos: Vec2;
  clockMs: number;
  createdAt: number;
};

type LastAttemptKey = string;

const pendingBySession = new Map<string, PendingPass>();
const lastAttemptAtByKey = new Map<string, number>();

export function resetPassTelemetrySession(sessionId: string): void {
  const sid = sessionId.trim();
  if (!sid) return;
  pendingBySession.delete(sid);
  for (const key of [...lastAttemptAtByKey.keys()]) {
    if (key.startsWith(`${sid}:`)) lastAttemptAtByKey.delete(key);
  }
}

export function getPendingPassForInterception(sessionId: string): PendingPass | null {
  return pendingBySession.get(sessionId.trim()) ?? null;
}

export function clearPendingPass(sessionId: string): void {
  pendingBySession.delete(sessionId.trim());
}

export function normalizePitchCoord(
  x: number,
  y: number,
  field: LiveFieldLayout,
): Vec2 {
  const w = Math.max(1, field.w);
  const h = Math.max(1, field.h);
  return {
    x: Math.min(1, Math.max(0, x / w)),
    y: Math.min(1, Math.max(0, y / h)),
  };
}

export type PassKickPlayer = {
  uid: string;
  x: number;
  y: number;
  team: MatchTeamSide;
};

/** Teammate in kick direction → pass (else shot/kick). */
export function detectPassTargetOnKick(
  kickerUid: string,
  kickerX: number,
  kickerY: number,
  dirX: number,
  dirY: number,
  players: PassKickPlayer[],
): { targetUid: string; teamId: MatchTeamSide; targetX: number; targetY: number } | null {
  const uid = kickerUid.trim();
  if (!uid) return null;
  const dirLen = Math.hypot(dirX, dirY);
  if (dirLen < 0.2) return null;
  const nx = dirX / dirLen;
  const ny = dirY / dirLen;

  const kicker = players.find((p) => p.uid === uid);
  const team = kicker?.team;
  if (!team) return null;

  let best: { targetUid: string; teamId: MatchTeamSide; targetX: number; targetY: number; score: number } | null =
    null;

  for (const p of players) {
    if (p.uid === uid || p.team !== team) continue;
    const tx = p.x - kickerX;
    const ty = p.y - kickerY;
    const dist = Math.hypot(tx, ty);
    if (dist < 24 || dist > PASS_MAX_TARGET_DIST) continue;
    const dot = (tx / dist) * nx + (ty / dist) * ny;
    if (dot < PASS_MIN_DIRECTION_DOT) continue;
    const score = dot * 2 - dist / PASS_MAX_TARGET_DIST;
    if (!best || score > best.score) {
      best = { targetUid: p.uid, teamId: team, targetX: p.x, targetY: p.y, score };
    }
  }

  if (!best) return null;
  return {
    targetUid: best.targetUid,
    teamId: best.teamId,
    targetX: best.targetX,
    targetY: best.targetY,
  };
}

function playersFromTeamSnapshot(
  players: Record<string, { x: number; y: number; team?: string }>,
): PassKickPlayer[] {
  const rows: PassKickPlayer[] = [];
  for (const [uid, p] of Object.entries(players)) {
    if (!uid.trim() || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.team !== "A" && p.team !== "B") continue;
    rows.push({ uid: uid.trim(), x: p.x, y: p.y, team: p.team });
  }
  return rows;
}

function playersFromLiveUids(
  kickerUid: string,
  opponentUid: string,
  kickerTeam: MatchTeamSide,
  kickerX: number,
  kickerY: number,
  opponentX: number,
  opponentY: number,
): PassKickPlayer[] {
  const oppTeam: MatchTeamSide = kickerTeam === "A" ? "B" : "A";
  return [
    { uid: kickerUid, x: kickerX, y: kickerY, team: kickerTeam },
    { uid: opponentUid, x: opponentX, y: opponentY, team: oppTeam },
  ];
}

function canEmitPassAttempt(sessionId: string, fromUid: string, targetUid: string, now: number): boolean {
  const key: LastAttemptKey = `${sessionId}:${fromUid}:${targetUid}`;
  const last = lastAttemptAtByKey.get(key) ?? 0;
  if (now - last < PASS_ATTEMPT_COOLDOWN_MS) return false;
  lastAttemptAtByKey.set(key, now);
  return true;
}

export type EmitKickOrPassArgs = {
  sessionId: string;
  field: LiveFieldLayout;
  kickerUid: string;
  kickerX: number;
  kickerY: number;
  dirX: number;
  dirY: number;
  ballX: number;
  ballY: number;
  mode: import("@/lib/matchmaking/types").MatchmakingMode;
  players: PassKickPlayer[];
};

/**
 * Host-only — pass target이면 PASS_ATTEMPT (+ pending), 아니면 false (caller가 KICK emit).
 */
export function tryEmitPassAttemptOnKick(
  bridge: { telemetrySession?: MatchTelemetrySession; sessionId: string },
  args: EmitKickOrPassArgs,
): boolean {
  const sessionId = args.sessionId.trim();
  if (!sessionId || !bridge.telemetrySession) return false;

  const target = detectPassTargetOnKick(
    args.kickerUid,
    args.kickerX,
    args.kickerY,
    args.dirX,
    args.dirY,
    args.players,
  );
  if (!target) return false;

  const now = Date.now();
  if (!canEmitPassAttempt(sessionId, args.kickerUid.trim(), target.targetUid, now)) {
    return false;
  }

  const clockMs = getMatchClockMs(bridge);
  const passId = `pass-${args.kickerUid.slice(0, 6)}-${clockMs}`;
  const fromBall = normalizePitchCoord(args.ballX, args.ballY, args.field);
  const toBall = normalizePitchCoord(target.targetX, target.targetY, args.field);

  pendingBySession.set(sessionId, {
    passId,
    fromUid: args.kickerUid.trim(),
    targetUid: target.targetUid,
    teamId: target.teamId,
    fromBall,
    targetPos: toBall,
    clockMs,
    createdAt: now,
  });

  emitPassAttemptTelemetry(bridge, {
    fromUid: args.kickerUid.trim(),
    teamId: target.teamId,
    ball: fromBall,
    dirX: args.dirX,
    dirY: args.dirY,
    clockMs,
    targetUid: target.targetUid,
    passId,
    to: toBall,
    mode: args.mode,
  });

  return true;
}

export function tryResolvePassCompleteOnBallTick(
  bridge: { telemetrySession?: MatchTelemetrySession; sessionId: string },
  ballX: number,
  ballY: number,
  players: PassKickPlayer[],
  field: LiveFieldLayout,
): void {
  const sessionId = bridge.sessionId.trim();
  if (!sessionId || !bridge.telemetrySession) return;

  const pending = pendingBySession.get(sessionId);
  if (!pending) return;

  if (Date.now() - pending.createdAt > PASS_COMPLETE_TTL_MS) {
    pendingBySession.delete(sessionId);
    return;
  }

  const receiver = players.find((p) => p.uid === pending.targetUid);
  if (!receiver) return;

  if (receiver.team !== pending.teamId) {
    pendingBySession.delete(sessionId);
    return;
  }

  const dist = Math.hypot(ballX - receiver.x, ballY - receiver.y);
  const receiveRadius = PLAYER_BALL_DRIBBLE_DIST + 12;
  if (dist > receiveRadius) return;

  for (const p of players) {
    if (p.team === pending.teamId) continue;
    const oppDist = Math.hypot(ballX - p.x, ballY - p.y);
    if (oppDist <= receiveRadius && oppDist < dist - 4) {
      return;
    }
  }

  const clockMs = getMatchClockMs(bridge);
  const toBall = normalizePitchCoord(ballX, ballY, field);

  emitPassCompleteTelemetry(bridge, {
    fromUid: pending.fromUid,
    toUid: pending.targetUid,
    teamId: pending.teamId,
    passId: pending.passId,
    from: pending.fromBall,
    to: toBall,
    clockMs,
    receivedAtMs: clockMs,
  });

  pendingBySession.delete(sessionId);
}

export function buildPassPlayersFromTeamBridge(
  players: Record<string, { x: number; y: number; team?: string }>,
): PassKickPlayer[] {
  return playersFromTeamSnapshot(players);
}

export function buildPassPlayersFromLiveBridge(
  kickerUid: string,
  opponentUid: string,
  kickerTeam: MatchTeamSide,
  kickerX: number,
  kickerY: number,
  opponentX: number,
  opponentY: number,
): PassKickPlayer[] {
  return playersFromLiveUids(kickerUid, opponentUid, kickerTeam, kickerX, kickerY, opponentX, opponentY);
}
