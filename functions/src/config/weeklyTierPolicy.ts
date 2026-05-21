/**
 * 주간 XP 랭킹 표시용 티어 (주간 시즌 누적 XP 기준).
 * WEEKLY_TOTAL 캡(1500)과 정합되도록 최상 티어는 그 이상.
 */
export type WeeklyXpTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export function tierFromWeeklyXp(weeklyXp: number): WeeklyXpTier {
  const x = Math.max(0, Math.floor(Number(weeklyXp) || 0));
  if (x < 300) return "bronze";
  if (x < 700) return "silver";
  if (x < 1200) return "gold";
  if (x < 1500) return "platinum";
  return "diamond";
}
