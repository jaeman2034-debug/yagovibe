/**
 * CV-1 I12-1 — playerGrowthAvatar read-only projection for Parent Surface (+ I12-2 narrative input)
 */
import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import type {
  AvatarTier,
  GrowthBadgeId,
  PlayerGrowthAvatarDoc,
} from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const PARENT_AVATAR_SURFACE_MAX_BADGES = 3 as const;

export type ParentAvatarSurfaceView = {
  level: number;
  levelLabel: string;
  tier: AvatarTier;
  tierLabelKo: string;
  tierEmoji: string;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  topBadgeIds: GrowthBadgeId[];
  topBadgeLabelsKo: string[];
};

export function buildParentAvatarSurfaceView(avatar: PlayerGrowthAvatarDoc): ParentAvatarSurfaceView {
  const level = avatar.level as 1 | 2 | 3 | 4 | 5;
  const tierMeta = AVATAR_TIER_LABELS[avatar.tier];
  const topBadgeIds = avatar.badges.slice(0, PARENT_AVATAR_SURFACE_MAX_BADGES);

  return {
    level,
    levelLabel: growthLevelLabel(level),
    tier: avatar.tier,
    tierLabelKo: tierMeta.labelKo,
    tierEmoji: tierMeta.emoji,
    ovr: avatar.ovr,
    vision: avatar.vision,
    pressure: avatar.pressure,
    recovery: avatar.recovery,
    topBadgeIds,
    topBadgeLabelsKo: topBadgeIds.map((id) => badgeMetaById(id).labelKo),
  };
}
