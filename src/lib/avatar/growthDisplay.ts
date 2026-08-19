import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthBadgeId } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { AvatarDoc } from "@/types/avatar";

export type AvatarGrowthDisplay = {
  ovr: number;
  tierLabel: string;
  tierEmoji: string;
  badges: Array<{ id: GrowthBadgeId; label: string; emoji: string }>;
  vision: number;
  pressure: number;
  recovery: number;
};

export function pickAvatarGrowthDisplay(avatar: AvatarDoc | null | undefined): AvatarGrowthDisplay | null {
  if (!avatar || typeof avatar.growthOvr !== "number" || avatar.growthOvr <= 0) return null;
  const tier = avatar.growthTier ?? "starter";
  const tierMeta = AVATAR_TIER_LABELS[tier] ?? AVATAR_TIER_LABELS.starter;
  const badgeIds = Array.isArray(avatar.growthBadges) ? avatar.growthBadges : [];

  return {
    ovr: Math.round(avatar.growthOvr),
    tierLabel: tierMeta.labelKo,
    tierEmoji: tierMeta.emoji,
    badges: badgeIds.map((id) => ({
      id,
      label: badgeMetaById(id).labelKo,
      emoji: badgeMetaById(id).emoji,
    })),
    vision: typeof avatar.growthVision === "number" ? avatar.growthVision : 0,
    pressure: typeof avatar.growthPressure === "number" ? avatar.growthPressure : 0,
    recovery: typeof avatar.growthRecovery === "number" ? avatar.growthRecovery : 0,
  };
}
