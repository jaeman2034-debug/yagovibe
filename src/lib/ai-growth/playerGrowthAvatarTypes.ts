export const PLAYER_GROWTH_AVATAR_SCHEMA_VERSION = 2 as const;

export type AvatarTier = "starter" | "bronze" | "silver" | "gold" | "elite";

/** Sprint D-4.3 — Growth Avatar 배지 ID (canonical) */
export type GrowthBadgeId =
  | "vision_reader"
  | "pressure_breaker"
  | "recovery_runner"
  | "playmaker"
  | "field_commander"
  | "transition_master"
  | "consistency_star";

/** @deprecated Firestore read-only alias → recovery_runner */
export type LegacyGrowthBadgeId = "quick_recovery";

export type GrowthBadgeCriterion =
  | { kind: "stat"; stat: "vision" | "pressure" | "recovery"; minStat: number }
  | { kind: "ovr"; minOvr: number }
  | { kind: "session"; minSessionCount: number };

export type GrowthBadgeMeta = {
  id: GrowthBadgeId;
  label: string;
  labelKo: string;
  emoji: string;
  criterion: GrowthBadgeCriterion;
  descriptionKo: string;
};

/** teams/{teamId}/playerGrowthAvatar/{playerId} — OVR · Level · Parent Avatar card */
export type PlayerGrowthAvatarDoc = {
  schemaVersion: typeof PLAYER_GROWTH_AVATAR_SCHEMA_VERSION;
  playerId: string;
  playerName: string;
  /** D-3 parent-facing level (OVR bands) */
  level: number;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  /** D-3 Firestore aliases (same values as vision/pressure/recovery) */
  visionScan?: number;
  pressureResistance?: number;
  recoverySpeed?: number;
  tier: AvatarTier;
  badges: GrowthBadgeId[];
  sessionCount?: number;
  lastSessionId?: string;
  /** Latest vs previous session overall delta */
  weeklyDeltaOvr?: number;
  /** D-4.1 — 직전 레벨 (레벨업 시 기록) */
  lastLevel?: number;
  /** D-4.1 — 마지막 레벨업 시각 (epoch ms) */
  lastLevelUpAt?: number;
  /** D-4.1 — 레벨업 직전 OVR (축하 카드 · 추세 표시) */
  lastOvr?: number;
  /** D-4.3 — 마지막 배지 해제 시각 */
  lastBadgeUnlockAt?: number;
  /** D-4.3 — 마지막 해제 배지 (Parent Home 신규 알림) */
  lastUnlockedBadges?: GrowthBadgeId[];
  /** D-5.2 — 마지막 OVR 마일스톤 시각 */
  lastOvrMilestoneAt?: number;
  /** D-5.2 — 마일스톤 직전 OVR */
  lastOvrMilestoneFrom?: number;
  /** D-5.2 — 마일스톤 이후 OVR */
  lastOvrMilestoneTo?: number;
  updatedAt: number;
  syncedFromOvrAt: number;
};
