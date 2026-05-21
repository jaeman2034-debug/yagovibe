/** 미니슛 연속 골 — 짧은 라벨 (2/3/5 이상 구간) */
export function getMiniShotStreakLabel(streak: number): string {
  if (streak >= 5) return "ON FIRE 🔥";
  if (streak >= 3) return "HOT!";
  if (streak >= 2) return "NICE!";
  return "";
}
