/** Playground 필드 경계 — cyan touchline(margin)과 동일, 골문 구간 Y 클램프 예외 */

import {
  detectPlaygroundBallInGoal,
  getPlaygroundGoalRectsFromLayout,
  isInPlaygroundGoalMouth as isInPlaygroundGoalMouthShared,
} from "@/game/unified/modules/goal";

export type PlaygroundPitchLayout = {
  w: number;
  h: number;
  margin: number;
  goalLeft: number;
  goalWidth: number;
  goalTopY: number;
  goalBottomY: number;
  goalDepth: number;
};

/** 골 판정·클램프와 동일한 X 허용 (mouthPad=4) */
export function isInPlaygroundGoalMouth(
  x: number,
  layout: PlaygroundPitchLayout,
): boolean {
  return isInPlaygroundGoalMouthShared(x, layout);
}

export function getPlaygroundGoalRects(layout: PlaygroundPitchLayout): {
  top: { x: number; y: number; w: number; h: number };
  bottom: { x: number; y: number; w: number; h: number };
} {
  return getPlaygroundGoalRectsFromLayout(layout);
}

/** 페인트 strokeRect + touchline 너머 골망 — clamp·overlap과 동일 rect */
export function isPlaygroundBallInGoal(
  ballX: number,
  ballY: number,
  layout: PlaygroundPitchLayout,
  ballRadius = 10,
): boolean {
  return detectPlaygroundBallInGoal(ballX, ballY, layout, ballRadius);
}

/** @deprecated use isPlaygroundBallInGoal — painted-only alias */
export function isPlaygroundBallInPaintedGoal(
  ballX: number,
  ballY: number,
  layout: PlaygroundPitchLayout,
  ballRadius = 10,
): boolean {
  return isPlaygroundBallInGoal(ballX, ballY, layout, ballRadius);
}

/** Arcade 터널링·penetration 대비 — 위치 클램프 + 축 반사 (1v1 clampBallInPlayArea와 동일 계약) */
export function clampPlaygroundBallInPitch(
  ball: { x: number; y: number; vx: number; vy: number },
  layout: PlaygroundPitchLayout,
  ballRadius = 10,
  bounce = 0.75,
): { x: number; y: number; vx: number; vy: number; clamped: boolean } {
  const pad = ballRadius + 2;
  const minX = layout.margin + pad;
  const maxX = layout.w - layout.margin - pad;
  const minY = layout.margin + pad;
  const maxY = layout.h - layout.margin - pad;
  const inGoalMouth = isInPlaygroundGoalMouth(ball.x, layout);
  const zones = getPlaygroundGoalRects(layout);
  const topGoalMinY = zones.top.y;
  const topGoalMaxY = zones.top.y + zones.top.h;
  const bottomGoalMinY = zones.bottom.y;
  const bottomGoalMaxY = zones.bottom.y + zones.bottom.h;

  let { x, y, vx, vy } = ball;
  let clamped = false;

  if (x < minX) {
    x = minX;
    vx = Math.abs(vx) * bounce;
    clamped = true;
  } else if (x > maxX) {
    x = maxX;
    vx = -Math.abs(vx) * bounce;
    clamped = true;
  }

  if (y < minY) {
    const inTopGoal = inGoalMouth && y >= topGoalMinY && y <= topGoalMaxY;
    if (!inTopGoal) {
      y = minY;
      vy = Math.abs(vy) * bounce;
      clamped = true;
    }
  } else if (y > maxY) {
    const inBottomGoal = inGoalMouth && y >= bottomGoalMinY && y <= bottomGoalMaxY;
    if (!inBottomGoal) {
      y = maxY;
      vy = -Math.abs(vy) * bounce;
      clamped = true;
    }
  }

  return { x, y, vx, vy, clamped };
}

type BallPos = {
  x: number;
  y: number;
  setPosition(x: number, y: number): void;
  body?: { updateFromGameObject(): void } | null;
};

/** 벽에 끼인 상태에서 슛 impulse가 먹히도록 킥 방향으로 살짝 들어올림 */
export function liftPlaygroundBallOffBoundary(
  ball: BallPos,
  layout: PlaygroundPitchLayout,
  ballRadius: number,
  kickVx: number,
  kickVy: number,
): void {
  const pad = ballRadius + 2;
  const minX = layout.margin + pad;
  const maxX = layout.w - layout.margin - pad;
  const minY = layout.margin + pad;
  const maxY = layout.h - layout.margin - pad;
  const lift = ballRadius * 0.55;

  let x = ball.x;
  let y = ball.y;

  if (kickVy < -12 && y >= maxY - lift) {
    y = maxY - lift;
  } else if (kickVy > 12 && y <= minY + lift) {
    y = minY + lift;
  }
  if (kickVx < -12 && x >= maxX - lift) {
    x = maxX - lift;
  } else if (kickVx > 12 && x <= minX + lift) {
    x = minX + lift;
  }

  if (x === ball.x && y === ball.y) return;
  ball.setPosition(x, y);
  ball.body?.updateFromGameObject();
}
