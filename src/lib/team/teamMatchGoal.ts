import { ref, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import {
  getLandscapeGoals,
  getPortraitGoals,
  type LiveFieldLayout,
} from "@/lib/live/liveFieldLayout";
import { BALL_RADIUS, BALL_WALL_BOUNCE } from "@/lib/physics/physicsConstants";
import type { BallMotionState } from "@/lib/physics/sharedBallPhysics";
import { emitGoalTelemetry } from "@/lib/telemetry/matchTelemetryHost";
import type { TeamMatchBridge } from "./teamMatchBridge";
import { defaultTeamBallPosition } from "./teamMatchPositions";
import { liveBallPath, liveTeamScorePath } from "./teamMatchRtdb";
import type { TeamId } from "./teamMatchTypes";
import type { FieldLayoutMode } from "@/lib/live/liveFieldLayout";

export const TEAM_GOAL_COOLDOWN_MS = 2500;

/**
 * snapshot.ball 기준 골 판정 — LiveMatch goal zone과 동일 mouth.
 * portrait: top=teamB(AWAY), bottom=teamA(HOME)
 * landscape: left=teamB, right=teamA
 */
export function detectTeamGoalScored(
  ball: BallMotionState,
  field: LiveFieldLayout,
  ballRadius = BALL_RADIUS,
): TeamId | null {
  if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) return null;

  if (field.mode === "portrait") {
    const pg = getPortraitGoals(field);
    const inMouthX = Math.abs(ball.x - pg.centerX) <= pg.halfMouth + ballRadius * 0.5;
    if (inMouthX && ball.y <= pg.topLineY + ballRadius) {
      return "B";
    }
    if (inMouthX && ball.y >= pg.bottomLineY - ballRadius) {
      return "A";
    }
    return null;
  }

  const lg = getLandscapeGoals(field);
  const inMouthY = Math.abs(ball.y - lg.centerY) <= lg.halfMouth + ballRadius * 0.5;
  if (inMouthY && ball.x <= lg.leftLineX + ballRadius) {
    return "B";
  }
  if (inMouthY && ball.x >= lg.rightLineX - ballRadius) {
    return "A";
  }
  return null;
}

/** 골문 구간은 clamp/bounce 제외 (1v1 buildWalls gap과 동일 의도) */
export function applyTeamFieldWallBounce(
  ball: BallMotionState,
  field: LiveFieldLayout,
  ballRadius = BALL_RADIUS,
  bounce = BALL_WALL_BOUNCE,
): void {
  const margin = field.margin;
  const minX = margin + ballRadius;
  const minY = margin + ballRadius;
  const maxX = field.w - margin - ballRadius;
  const maxY = field.h - margin - ballRadius;

  if (field.mode === "portrait") {
    const pg = getPortraitGoals(field);
    const inTopMouth = Math.abs(ball.x - pg.centerX) <= pg.halfMouth;
    const inBotMouth = Math.abs(ball.x - pg.centerX) <= pg.halfMouth;

    if (ball.y < minY && !inTopMouth) {
      ball.y = minY;
      ball.vy = Math.abs(ball.vy) * bounce;
    } else if (ball.y > maxY && !inBotMouth) {
      ball.y = maxY;
      ball.vy = -Math.abs(ball.vy) * bounce;
    }
    if (ball.x < minX) {
      ball.x = minX;
      ball.vx = Math.abs(ball.vx) * bounce;
    } else if (ball.x > maxX) {
      ball.x = maxX;
      ball.vx = -Math.abs(ball.vx) * bounce;
    }
    return;
  }

  const lg = getLandscapeGoals(field);
  const inLeftMouth = Math.abs(ball.y - lg.centerY) <= lg.halfMouth;
  const inRightMouth = Math.abs(ball.y - lg.centerY) <= lg.halfMouth;

  if (ball.x < minX && !inLeftMouth) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * bounce;
  } else if (ball.x > maxX && !inRightMouth) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * bounce;
  }
  if (ball.y < minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * bounce;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * bounce;
  }
}

/** Host — score RTDB + ball center reset */
export function commitHostTeamGoal(
  bridge: TeamMatchBridge,
  scoringTeam: TeamId,
  fieldLayoutMode: FieldLayoutMode,
): void {
  const scoreBefore = { ...bridge.snapshot.score };
  const prev = scoreBefore;
  const nextScore =
    scoringTeam === "A"
      ? { teamA: prev.teamA + 1, teamB: prev.teamB }
      : { teamA: prev.teamA, teamB: prev.teamB + 1 };

  emitGoalTelemetry(bridge, {
    scoringTeam,
    scoreBefore,
    scoreAfter: nextScore,
  });
  const center = defaultTeamBallPosition(fieldLayoutMode);
  const ball = {
    x: center.x,
    y: center.y,
    vx: 0,
    vy: 0,
    ownerUid: null as string | null,
  };

  if (bridge.applyHudToReact) {
    bridge.applyHudToReact({ score: nextScore, ball });
  } else {
    bridge.snapshot.score = nextScore;
    bridge.snapshot.ball = ball;
  }

  const sid = bridge.sessionId.trim();
  if (!sid) return;

  void update(ref(rtdb), {
    [liveTeamScorePath(sid)]: nextScore,
    [liveBallPath(sid)]: ball,
  }).catch((e) => {
    console.warn("[TEAM GOAL] RTDB commit failed", e);
  });

  if (import.meta.env.DEV) {
    console.info("[TEAM GOAL] scored", {
      team: scoringTeam,
      score: nextScore,
      ball: { x: Math.round(center.x), y: Math.round(center.y) },
    });
  }
}
