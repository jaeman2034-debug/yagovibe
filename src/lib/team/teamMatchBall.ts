import type { LiveFieldLayout } from "@/lib/live/liveFieldLayout";
import {
  BALL_RADIUS,
  KICK_FORCE,
  KICK_RANGE,
  TEAM_KICK_FORCE,
  TEAM_KICK_RANGE,
} from "@/lib/physics/physicsConstants";
import {
  applyFriction,
  clampVelocity,
  computeKickImpulse,
  resolveBallPlayerContacts,
  type KinematicPlayerSample,
} from "@/lib/physics/sharedBallPhysics";
import { applyTeamFieldWallBounce, detectTeamGoalScored } from "./teamMatchGoal";
import type { TeamId } from "./teamMatchTypes";

export type { KinematicPlayerSample };
import type { TeamBallState } from "./teamMatchTypes";

export { KICK_RANGE as TEAM_KICK_RANGE, KICK_FORCE as TEAM_KICK_FORCE };

export function computeTeamKickImpulse(
  kickerX: number,
  kickerY: number,
  ball: TeamBallState,
  moveInput: { x: number; y: number },
  kickerUid: string,
): TeamBallState | null {
  const next = computeKickImpulse({
    kickerX,
    kickerY,
    ballX: ball.x,
    ballY: ball.y,
    moveInput,
    ownerUid: kickerUid,
  });
  if (!next) return null;
  return {
    x: next.x,
    y: next.y,
    vx: next.vx,
    vy: next.vy,
    ownerUid: next.ownerUid,
  };
}

/** Guest relay — Guest가 계산한 단위 방향을 Host authoritative ball에 적용 */
export function applyTeamKickImpulseFromDirection(
  ball: TeamBallState,
  direction: { x: number; y: number },
  kickerUid: string,
): TeamBallState | null {
  const len = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(len) || len < 0.35 || len > 1.25) return null;
  const nx = direction.x / len;
  const ny = direction.y / len;
  return {
    x: ball.x,
    y: ball.y,
    vx: nx * KICK_FORCE,
    vy: ny * KICK_FORCE,
    ownerUid: kickerUid.trim() || null,
  };
}

/**
 * Host authority kinematic step — 순서:
 * integrate → player contact → friction → **goal detect** → wall bounce (goal mouth gap)
 */
export function integrateTeamBall(
  ball: TeamBallState,
  dtSec: number,
  field: LiveFieldLayout,
  players: KinematicPlayerSample[] = [],
): TeamId | null {
  if (dtSec <= 0) return null;

  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;
  if (players.length > 0) {
    resolveBallPlayerContacts(ball, players, dtSec, { ballRadius: BALL_RADIUS });
  }
  applyFriction(ball, dtSec);

  const scored = detectTeamGoalScored(ball, field, BALL_RADIUS);
  if (!scored) {
    applyTeamFieldWallBounce(ball, field, BALL_RADIUS);
  }
  clampVelocity(ball);
  return scored;
}
