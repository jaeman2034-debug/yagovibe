/**
 * J3-2 — Avatar XP System read-only projection (playerGrowthAvatar)
 */
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const AVATAR_XP_PER_LEVEL = 1000;
export const AVATAR_XP_MAX_LEVEL = 5;

export type AvatarXpSystemView = {
  level: number;
  currentXp: number;
  nextLevelXp: number | null;
  progress: number;
  xpLabel: string;
  levelUpLabel: string;
};

function computeProgress(currentXp: number, nextLevelXp: number | null): number {
  if (nextLevelXp == null || nextLevelXp <= 0) return 100;
  return Math.min(100, Math.floor((currentXp / nextLevelXp) * 100));
}

/**
 * Growth avatar stats → display XP (J3-2 MVP projection · no new SoT write).
 * Pilot Level 4 · OVR 85 → 3280 XP (82% of 4000).
 */
export function projectGrowthDisplayXp(avatar: PlayerGrowthAvatarDoc): number {
  const level = Math.min(AVATAR_XP_MAX_LEVEL, Math.max(1, avatar.level));
  const bandStart = (level - 1) * AVATAR_XP_PER_LEVEL;
  const ovrSlice = Math.min(99, Math.max(0, avatar.ovr - level * 15));
  const offset = Math.min(AVATAR_XP_PER_LEVEL - 1, Math.floor(ovrSlice * 11.2));
  return bandStart + offset;
}

export function buildAvatarXpSystemView(avatar: PlayerGrowthAvatarDoc): AvatarXpSystemView {
  const level = Math.min(AVATAR_XP_MAX_LEVEL, Math.max(1, avatar.level));
  const currentXp = projectGrowthDisplayXp(avatar);
  const nextLevelXp = level >= AVATAR_XP_MAX_LEVEL ? null : level * AVATAR_XP_PER_LEVEL;
  const progress = computeProgress(currentXp, nextLevelXp);

  const xpLabel =
    nextLevelXp != null ? `XP ${currentXp} / ${nextLevelXp}` : `XP ${currentXp} (MAX)`;

  const levelUpLabel =
    level >= AVATAR_XP_MAX_LEVEL
      ? `Level ${level} 달성`
      : `Level ${level} → Level ${level + 1}`;

  return {
    level,
    currentXp,
    nextLevelXp,
    progress,
    xpLabel,
    levelUpLabel,
  };
}
