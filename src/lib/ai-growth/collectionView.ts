/**
 * J2-4 — Badge Collection read-only projection (playerGrowthAvatar + GROWTH_BADGE_CATALOG)
 */
import {
  GROWTH_BADGE_CATALOG,
  badgeMetaById,
} from "@/lib/ai-growth/avatarGrowthEngine";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import type { GrowthBadgeMeta } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { GrowthBadgeId, PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export type CollectionBadgeItem = {
  id: GrowthBadgeId;
  labelKo: string;
  emoji: string;
  rarity: string;
  acquired: boolean;
  descriptionKo: string;
};

export type CollectionView = {
  catalogTotal: number;
  acquiredCount: number;
  countLabel: string;
  acquiredBadges: CollectionBadgeItem[];
  lockedBadges: CollectionBadgeItem[];
  recentUnlockLabels: string[];
  showRecentUnlock: boolean;
};

export function badgeRarityLabel(badge: GrowthBadgeMeta): string {
  const criterion = badge.criterion;
  if (criterion.kind === "session") return "훈련";
  if (criterion.kind === "ovr") return "골드";
  if (criterion.kind === "stat" && criterion.minStat >= 90) return "희귀";
  return "일반";
}

function toCollectionItem(badge: GrowthBadgeMeta, acquired: boolean): CollectionBadgeItem {
  return {
    id: badge.id,
    labelKo: badge.labelKo,
    emoji: badge.emoji,
    rarity: badgeRarityLabel(badge),
    acquired,
    descriptionKo: badge.descriptionKo,
  };
}

export function buildCollectionView(avatar: PlayerGrowthAvatarDoc): CollectionView {
  const acquiredSet = new Set(avatar.badges);
  const catalogTotal = GROWTH_BADGE_CATALOG.length;
  const acquiredCount = avatar.badges.length;

  const acquiredBadges = avatar.badges.map((id) =>
    toCollectionItem(badgeMetaById(id), true)
  );

  const lockedBadges = GROWTH_BADGE_CATALOG
    .filter((badge) => !acquiredSet.has(badge.id))
    .map((badge) => toCollectionItem(badge, false));

  const showRecentUnlock =
    isRecentBadgeUnlock(avatar.lastBadgeUnlockAt) &&
    (avatar.lastUnlockedBadges?.length ?? 0) > 0;

  const recentUnlockLabels = showRecentUnlock
    ? (avatar.lastUnlockedBadges ?? []).map((id) => badgeMetaById(id).labelKo)
    : [];

  return {
    catalogTotal,
    acquiredCount,
    countLabel: `${acquiredCount} / ${catalogTotal}`,
    acquiredBadges,
    lockedBadges,
    recentUnlockLabels,
    showRecentUnlock,
  };
}
