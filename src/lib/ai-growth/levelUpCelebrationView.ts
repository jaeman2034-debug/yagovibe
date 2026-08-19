import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import {
  isRecentLevelUp,
  type GrowthLevelUpEvent,
} from "@/lib/ai-growth/growthAvatarLevelUp";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export function formatLevelUpRelativeDay(lastLevelUpAt: number, now = Date.now()): string {
  const diffDays = Math.floor((now - lastLevelUpAt) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

export function computeLevelUpDelta(avatar: PlayerGrowthAvatarDoc): number {
  if (typeof avatar.lastLevel === "number" && avatar.level > avatar.lastLevel) {
    return avatar.level - avatar.lastLevel;
  }
  return 1;
}

/** J2-1 — recent level-up from avatar SoT (read-only) */
export function buildRecentLevelUpFromAvatar(
  avatar: PlayerGrowthAvatarDoc,
  playerName: string
): GrowthLevelUpEvent | null {
  if (!isRecentLevelUp(avatar.lastLevelUpAt)) return null;
  if (typeof avatar.lastLevel !== "number" || avatar.level <= avatar.lastLevel) return null;
  return {
    playerName: playerName.trim() || avatar.playerName || "선수",
    previousLevel: avatar.lastLevel,
    currentLevel: avatar.level,
    previousOvr: avatar.lastOvr ?? avatar.ovr,
    currentOvr: avatar.ovr,
  };
}

export function recentLevelUpBadgeLabels(avatar: PlayerGrowthAvatarDoc): string[] {
  if (!isRecentBadgeUnlock(avatar.lastBadgeUnlockAt)) return [];
  return (avatar.lastUnlockedBadges ?? []).map((id) => badgeMetaById(id).labelKo);
}
