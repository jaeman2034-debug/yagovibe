import type { Timestamp } from "firebase/firestore";
import type { AvatarTier, GrowthBadgeId } from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** `avatars/{uid}` — growth* prefix (기존 appearance/progression/stats 비침범) */
export type AvatarGrowthMirrorFields = {
  growthOvr: number;
  growthTier: AvatarTier;
  growthBadges: GrowthBadgeId[];
  growthVision: number;
  growthPressure: number;
  growthRecovery: number;
  growthUpdatedAt: Timestamp | number;
  growthSyncedFromTeamId: string;
  growthPlayerId: string;
};
