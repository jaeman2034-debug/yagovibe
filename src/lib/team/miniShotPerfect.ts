/** 정확도(0~1, 슛 직후 계산값) 기준 퍼펙트 판정 */
export const MINI_SHOT_PERFECT_ACCURACY_THRESHOLD = 0.9;

export function isMiniShotPerfectAccuracy(accuracy: number): boolean {
  return Number.isFinite(accuracy) && accuracy >= MINI_SHOT_PERFECT_ACCURACY_THRESHOLD;
}

export function getMiniShotPerfectLabel(): string {
  return "PERFECT ⚡";
}
