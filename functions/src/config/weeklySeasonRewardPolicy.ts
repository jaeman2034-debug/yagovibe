/**
 * 주간 시즌 정산 시점 스냅샷 보상(MVP — XP/배지).
 * 정책 변경 시에는 **이후 시즌**부터 적용; 이미 저장된 결과 문서에는 영향 없음.
 */
import type { WeeklyXpTier } from "./weeklyTierPolicy";

export type WeeklySeasonRewardSnapshot = {
  bonusXp: number;
  badgeCodes: string[];
};

export function getWeeklySeasonRewardSnapshotForTier(tier: WeeklyXpTier): WeeklySeasonRewardSnapshot {
  switch (tier) {
    case "bronze":
      return { bonusXp: 0, badgeCodes: ["weeklySeasonBronze"] };
    case "silver":
      return { bonusXp: 20, badgeCodes: [] };
    case "gold":
      return { bonusXp: 50, badgeCodes: [] };
    case "platinum":
      return { bonusXp: 80, badgeCodes: [] };
    case "diamond":
      return { bonusXp: 100, badgeCodes: ["weeklySeasonDiamond"] };
    default:
      return { bonusXp: 0, badgeCodes: [] };
  }
}
