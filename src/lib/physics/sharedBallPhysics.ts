import {
  BALL_FRICTION_EXP_BASE,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_STOP_SPEED,
  BALL_WALL_BOUNCE,
  DRIBBLE_PUSH_STRENGTH,
  KICK_CLOSE_DIST,
  KICK_DIRECTION_BLEND,
  KICK_FORCE,
  KICK_MOVE_INPUT_MIN,
  KICK_RANGE,
  KICK_STICK_INPUT_MIN,
  PLAYER_BALL_DRIBBLE_DIST,
  PLAYER_BALL_MIN_SEP,
  PLAYER_RADIUS_KINEMATIC,
} from "./physicsConstants";

export type BallMotionState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type FieldBounds = {
  w: number;
  h: number;
  margin?: number;
};

export type KickDirectionInput = {
  kickerX: number;
  kickerY: number;
  ballX: number;
  ballY: number;
  moveInput: { x: number; y: number };
  /** 1v1: 근접 킥 시 조이스틱 없으면 facing */
  facing?: { x: number; y: number };
};

export type KickImpulseInput = KickDirectionInput & {
  ownerUid?: string | null;
};

export type KickImpulseResult = BallMotionState & {
  ownerUid: string | null;
};

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/** 슛 방향 단위벡터 — range 밖이면 null */
export function computeKickDirection(input: KickDirectionInput): { x: number; y: number } | null {
  const dx = input.ballX - input.kickerX;
  const dy = input.ballY - input.kickerY;
  const dist = Math.hypot(dx, dy);
  if (dist > KICK_RANGE) return null;

  let fx: number;
  let fy: number;

  if (dist > KICK_CLOSE_DIST) {
    ({ x: fx, y: fy } = normalize(dx, dy));
  } else if (Math.hypot(input.moveInput.x, input.moveInput.y) > KICK_MOVE_INPUT_MIN) {
    ({ x: fx, y: fy } = normalize(input.moveInput.x, input.moveInput.y));
  } else if (input.facing && Math.hypot(input.facing.x, input.facing.y) > 0.1) {
    ({ x: fx, y: fy } = normalize(input.facing.x, input.facing.y));
  } else {
    ({ x: fx, y: fy } = normalize(dx, dy));
  }

  if (dist > KICK_CLOSE_DIST && Math.hypot(input.moveInput.x, input.moveInput.y) > KICK_STICK_INPUT_MIN) {
    const blend = KICK_DIRECTION_BLEND;
    fx = fx * (1 - blend) + input.moveInput.x * blend;
    fy = fy * (1 - blend) + input.moveInput.y * blend;
    ({ x: fx, y: fy } = normalize(fx, fy));
  }

  return { x: fx, y: fy };
}

/** 킥 impulse — 위치 유지, 속도·owner 갱신 */
export function computeKickImpulse(input: KickImpulseInput): KickImpulseResult | null {
  const dir = computeKickDirection(input);
  if (!dir) return null;

  return {
    x: input.ballX,
    y: input.ballY,
    vx: dir.x * KICK_FORCE,
    vy: dir.y * KICK_FORCE,
    ownerUid: input.ownerUid?.trim() || null,
  };
}

export function applyFriction(ball: BallMotionState, dtSec: number): void {
  if (dtSec <= 0) return;
  const drag = Math.pow(BALL_FRICTION_EXP_BASE, dtSec * 60);
  ball.vx *= drag;
  ball.vy *= drag;
  if (Math.hypot(ball.vx, ball.vy) < BALL_STOP_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

export function clampVelocity(ball: BallMotionState, maxSpeed = BALL_MAX_SPEED): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed <= maxSpeed || speed <= 0) return;
  const scale = maxSpeed / speed;
  ball.vx *= scale;
  ball.vy *= scale;
}

export function applyWallBounce(
  ball: BallMotionState,
  field: FieldBounds,
  ballRadius = BALL_RADIUS,
  bounce = BALL_WALL_BOUNCE,
): { clamped: boolean } {
  const margin = field.margin ?? 0;
  const minX = margin + ballRadius;
  const minY = margin + ballRadius;
  const maxX = field.w - margin - ballRadius;
  const maxY = field.h - margin - ballRadius;
  let clamped = false;

  if (ball.x < minX) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * bounce;
    clamped = true;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * bounce;
    clamped = true;
  }
  if (ball.y < minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * bounce;
    clamped = true;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * bounce;
    clamped = true;
  }

  return { clamped };
}

export type KinematicPlayerSample = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

/**
 * Host authority — overlap 분리 + 이동 중 접촉 시 공 밀기(드리블).
 * 1v1 Arcade `separatePlayerFromBall` + 근접 carry의 kinematic 이식.
 */
export function resolveBallPlayerContacts(
  ball: BallMotionState,
  players: KinematicPlayerSample[],
  dtSec: number,
  opts?: { ballRadius?: number; playerRadius?: number },
): void {
  if (players.length === 0 || dtSec <= 0) return;

  const ballR = opts?.ballRadius ?? BALL_RADIUS;
  const playerR = opts?.playerRadius ?? PLAYER_RADIUS_KINEMATIC;
  const minSep = ballR + playerR;
  const dribbleDist = PLAYER_BALL_DRIBBLE_DIST;
  const dtScale = Math.min(2.5, dtSec * 60);

  for (const p of players) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

    let dx = ball.x - p.x;
    let dy = ball.y - p.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1e-4) {
      dx = 1;
      dy = 0;
      dist = 1;
    }

    if (dist < minSep) {
      const push = (minSep - dist) * 0.85;
      ball.x += (dx / dist) * push;
      ball.y += (dy / dist) * push;
      const away = 48 * dtScale;
      ball.vx += (dx / dist) * away;
      ball.vy += (dy / dist) * away;
    }

    const pSpeed = Math.hypot(p.vx, p.vy);
    if (dist >= dribbleDist || pSpeed < 12) continue;

    const nx = p.vx / pSpeed;
    const ny = p.vy / pSpeed;
    const proximity = 1 - Math.min(1, dist / dribbleDist);
    const push = DRIBBLE_PUSH_STRENGTH * proximity * dtScale;
    ball.vx += nx * push;
    ball.vy += ny * push;
    const follow = proximity * 0.42;
    ball.vx += nx * pSpeed * follow;
    ball.vy += ny * pSpeed * follow;
  }
}

/** Host authority kinematic step (5v5/8v8) */
export function integrateBall(
  ball: BallMotionState,
  dtSec: number,
  field: FieldBounds,
  ballRadius = BALL_RADIUS,
  players: KinematicPlayerSample[] = [],
): void {
  if (dtSec <= 0) return;

  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;
  if (players.length > 0) {
    resolveBallPlayerContacts(ball, players, dtSec, { ballRadius });
  }
  applyFriction(ball, dtSec);
  applyWallBounce(ball, field, ballRadius);
  clampVelocity(ball);
}
