export type ShotGrade = "PERFECT" | "GOOD" | "OK" | "MISS";
export type TargetSize = "LARGE" | "MEDIUM" | "SMALL";
export type TargetMotion = "STATIC" | "HORIZONTAL" | "VERTICAL";

const GRADE_THRESHOLD_BASE = {
  PERFECT: 10,
  GOOD: 25,
  OK: 50,
} as const;

const TARGET_SIZE_GRADE_MULTIPLIER: Record<TargetSize, number> = {
  LARGE: 1.4,
  MEDIUM: 1.0,
  SMALL: 0.6,
};

const TARGET_SIZE_XP_MULTIPLIER: Record<TargetSize, number> = {
  LARGE: 1.0,
  MEDIUM: 1.2,
  SMALL: 1.5,
};

const TARGET_MOTION_XP_MULTIPLIER: Record<TargetMotion, number> = {
  STATIC: 1.0,
  HORIZONTAL: 1.2,
  VERTICAL: 1.2,
};

export function getShotGrade(distance: number, size: TargetSize = "MEDIUM"): ShotGrade {
  const thresholdMul = TARGET_SIZE_GRADE_MULTIPLIER[size];
  if (distance < GRADE_THRESHOLD_BASE.PERFECT * thresholdMul) return "PERFECT";
  if (distance < GRADE_THRESHOLD_BASE.GOOD * thresholdMul) return "GOOD";
  if (distance < GRADE_THRESHOLD_BASE.OK * thresholdMul) return "OK";
  return "MISS";
}

export function getXpByGrade(grade: ShotGrade): number {
  switch (grade) {
    case "PERFECT":
      return 30;
    case "GOOD":
      return 20;
    case "OK":
      return 10;
    case "MISS":
      return 0;
  }
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 4) return 2.0;
  if (combo === 3) return 1.5;
  if (combo === 2) return 1.2;
  return 1.0;
}

export function getTargetSizeXpMultiplier(size: TargetSize): number {
  return TARGET_SIZE_XP_MULTIPLIER[size];
}

export function getRandomTargetSize(): TargetSize {
  const rand = Math.random();
  if (rand < 0.5) return "LARGE";
  if (rand < 0.85) return "MEDIUM";
  return "SMALL";
}

export function getRandomTargetMotion(size: TargetSize): TargetMotion {
  const rand = Math.random();
  if (size === "SMALL") {
    return rand < 0.65 ? "HORIZONTAL" : "VERTICAL";
  }
  if (rand < 0.5) return "STATIC";
  if (rand < 0.75) return "HORIZONTAL";
  return "VERTICAL";
}

export function getTargetMotionXpMultiplier(motion: TargetMotion): number {
  return TARGET_MOTION_XP_MULTIPLIER[motion];
}
