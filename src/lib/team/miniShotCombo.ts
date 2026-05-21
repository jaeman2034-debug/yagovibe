/** 퍼펙트 골마다 +0.5, 상한 3배 */
export const MINI_SHOT_COMBO_MUL_MAX = 3;
export const MINI_SHOT_COMBO_PERFECT_STEP = 0.5;
export const MINI_SHOT_COMBO_SCORE_BASE = 10;

export function bumpMiniShotComboMul(current: number, isPerfect: boolean): number {
  if (!isPerfect) return current;
  return Math.min(current + MINI_SHOT_COMBO_PERFECT_STEP, MINI_SHOT_COMBO_MUL_MAX);
}

export function getComboLabel(_streak: number, comboMul: number): string {
  if (comboMul >= 2.5) return "INSANE 🔥";
  if (comboMul >= 2) return "COMBO x2";
  if (comboMul > 1) return "POWER UP";
  return "";
}
