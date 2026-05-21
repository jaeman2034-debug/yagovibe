export type FieldRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GoalZoneKey = "LEFT" | "CENTER" | "RIGHT";

export type GoalZoneRect = FieldRect & {
  key: GoalZoneKey;
};

export const FIELD = {
  WIDTH: 100,
  HEIGHT: 100,
  LOWER_THIRD_Y: 66.6,
  TOP_GOAL_LINE_Y: 0,
  BOTTOM_GOAL_LINE_Y: 90,
  GOAL_WIDTH: 36,
  GOAL_HEIGHT: 6,
  GOAL_MOUTH_WIDTH: 22,
  GOAL_MOUTH_HEIGHT: 12,
  PENALTY_HEIGHT: 18,
  SIX_YARD_HEIGHT: 8,
  TOP_PENALTY_TOP_OFFSET: 8,
  BOTTOM_PENALTY_BOTTOM_OFFSET: 4,
  PENALTY_SPOT_OFFSET: 12,
  GK_OFFSET: 2,
  CENTER_X: 50,
  CENTER_Y: 50,
  CENTER_RADIUS: 18,
  PLAYER_START: { x: 50, y: 74 },
  BALL_START: { x: 50, y: 82 },
  ZONE_FADE_OPACITY: 0.4,
  ZONE_FADE_SCALE: 0.85,
} as const;

export function getTopGoal(): FieldRect {
  return {
    left: 50 - FIELD.GOAL_WIDTH / 2,
    top: FIELD.TOP_GOAL_LINE_Y - FIELD.GOAL_HEIGHT / 2,
    width: FIELD.GOAL_WIDTH,
    height: FIELD.GOAL_HEIGHT,
  };
}

export function getBottomGoal(): FieldRect {
  return {
    left: 50 - FIELD.GOAL_WIDTH / 2,
    top: FIELD.BOTTOM_GOAL_LINE_Y - FIELD.GOAL_HEIGHT / 2,
    width: FIELD.GOAL_WIDTH,
    height: FIELD.GOAL_HEIGHT,
  };
}

export function getTopGoalMouth(): FieldRect {
  return {
    left: 50 - FIELD.GOAL_MOUTH_WIDTH / 2,
    top: FIELD.TOP_GOAL_LINE_Y,
    width: FIELD.GOAL_MOUTH_WIDTH,
    height: FIELD.GOAL_MOUTH_HEIGHT,
  };
}

export function getBottomGoalMouth(): FieldRect {
  return {
    left: 50 - FIELD.GOAL_MOUTH_WIDTH / 2,
    top: FIELD.BOTTOM_GOAL_LINE_Y - FIELD.GOAL_MOUTH_HEIGHT,
    width: FIELD.GOAL_MOUTH_WIDTH,
    height: FIELD.GOAL_MOUTH_HEIGHT,
  };
}

export function getTopSixYardBox(): FieldRect {
  return {
    left: 50 - 28 / 2,
    top: FIELD.TOP_GOAL_LINE_Y,
    width: 28,
    height: FIELD.SIX_YARD_HEIGHT,
  };
}

export function getBottomSixYardBox(): FieldRect {
  return {
    left: 50 - 28 / 2,
    top: FIELD.BOTTOM_GOAL_LINE_Y - FIELD.SIX_YARD_HEIGHT - 4,
    width: 28,
    height: FIELD.SIX_YARD_HEIGHT,
  };
}

export function getTopPenaltyBox(): FieldRect {
  return {
    left: 20,
    top: FIELD.TOP_GOAL_LINE_Y,
    width: 60,
    height: FIELD.PENALTY_HEIGHT,
  };
}

export function getBottomPenaltyBox(): FieldRect {
  return {
    left: 20,
    top: FIELD.BOTTOM_GOAL_LINE_Y - FIELD.PENALTY_HEIGHT - FIELD.BOTTOM_PENALTY_BOTTOM_OFFSET,
    width: 60,
    height: FIELD.PENALTY_HEIGHT,
  };
}

export function getTopGoalZones(): GoalZoneRect[] {
  const mouth = getTopGoalMouth();
  const zoneWidth = mouth.width / 3;
  return [
    { key: "LEFT", left: mouth.left, top: mouth.top, width: zoneWidth, height: mouth.height },
    { key: "CENTER", left: mouth.left + zoneWidth, top: mouth.top, width: zoneWidth, height: mouth.height },
    { key: "RIGHT", left: mouth.left + zoneWidth * 2, top: mouth.top, width: zoneWidth, height: mouth.height },
  ];
}
