import {
  BALL_RADIUS,
  KICK_FORCE,
  KICK_RANGE,
  PLAYER_RADIUS_KINEMATIC,
} from "./physicsConstants";
import { computeKickDirection, type KickDirectionInput } from "./sharedBallPhysics";

export { KICK_FORCE, KICK_RANGE } from "./physicsConstants";

/** 드래그/조준 — 플레이어 → 목표 좌표 (atan2) */
export function shootVelocityFromTarget(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  speed: number = KICK_FORCE,
): { vx: number; vy: number } | null {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const len = Math.hypot(dx, dy);
  if (len < 8) return null;
  const angle = Math.atan2(dy, dx);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** 1v1·5v5 — 공-발 근접 + 조이스틱 blend (computeKickDirection) */
export function shootVelocityFromKickInput(
  input: KickDirectionInput,
  speed: number = KICK_FORCE,
): { vx: number; vy: number } | null {
  const dir = computeKickDirection(input);
  if (!dir) return null;
  return { vx: dir.x * speed, vy: dir.y * speed };
}

/** 조이스틱/키보드/슛! — 입력 단위벡터 → 속도 (플레이어→조준, 공 위치 무관) */
export function shootVelocityFromAimUnit(
  aimX: number,
  aimY: number,
  speed: number = KICK_FORCE,
): { vx: number; vy: number } | null {
  const len = Math.hypot(aimX, aimY);
  if (len < 0.1) return null;
  const angle = Math.atan2(aimY, aimX);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** 화면(캔버스) 드래그 Δ — 카메라 follow 중에도 방향 일치 (탑다운, 회전 없음) */
export function shootVelocityFromScreenDelta(
  screenDx: number,
  screenDy: number,
  speed: number = KICK_FORCE,
): { vx: number; vy: number } | null {
  const len = Math.hypot(screenDx, screenDy);
  if (len < 8) return null;
  const angle = Math.atan2(screenDy, screenDx);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

export function isWithinKickRange(
  kickerX: number,
  kickerY: number,
  ballX: number,
  ballY: number,
  range: number = KICK_RANGE,
): boolean {
  return Math.hypot(ballX - kickerX, ballY - kickerY) <= range;
}

export type ArcadeBallLike = {
  x: number;
  y: number;
  setPosition(x: number, y: number): void;
  setVelocity(x: number, y: number): void;
  body?: {
    setVelocity(x: number, y: number): void;
    updateFromGameObject(): void;
  } | null;
};

export function separateArcadeBallFromKicker(
  ball: ArcadeBallLike,
  kickerX: number,
  kickerY: number,
  ballRadius = BALL_RADIUS,
  playerRadius = PLAYER_RADIUS_KINEMATIC,
): void {
  const dx = ball.x - kickerX;
  const dy = ball.y - kickerY;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = ballRadius + playerRadius;
  if (dist >= minDist) return;
  const push = (minDist - dist) * 0.85;
  ball.setPosition(ball.x + (dx / dist) * push, ball.y + (dy / dist) * push);
  ball.body?.updateFromGameObject();
}

/** Arcade 공에 슛 impulse — collider 없이 separate + velocity (1v1·운동장 공통) */
export function applyArcadeKickImpulse(
  ball: ArcadeBallLike,
  kickerX: number,
  kickerY: number,
  vx: number,
  vy: number,
  opts?: { prePush?: number; ballRadius?: number; playerRadius?: number },
): void {
  const len = Math.hypot(vx, vy) || 1;
  const nx = vx / len;
  const ny = vy / len;
  const prePush = opts?.prePush ?? 6;
  ball.setPosition(ball.x + nx * prePush, ball.y + ny * prePush);
  separateArcadeBallFromKicker(ball, kickerX, kickerY, opts?.ballRadius, opts?.playerRadius);
  ball.setVelocity(vx, vy);
  if (ball.body) {
    ball.body.setVelocity(vx, vy);
  }
}
