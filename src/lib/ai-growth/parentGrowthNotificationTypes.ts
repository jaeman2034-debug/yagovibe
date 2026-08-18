import type { GrowthBadgeId } from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** Sprint D-5.2-a / J1-2 — Parent Home 성장 알림 레지스트리 */
export type ParentGrowthNotificationType =
  | "LEVEL_UP"
  | "BADGE_UNLOCK"
  | "OVR_MILESTONE"
  | "WEEKLY_GROWTH_DIGEST";

export const PARENT_GROWTH_NOTIFICATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type ParentGrowthNotification = {
  id: string;
  type: ParentGrowthNotificationType;
  teamId: string;
  playerId: string;
  playerName: string;
  occurredAt: number;
  title: string;
  body: string;
  emoji: string;
  badgeIds?: GrowthBadgeId[];
  level?: number;
  ovrFrom?: number;
  ovrTo?: number;
  /** J1-2 composite — multi-line digest copy (projection only) */
  digestLines?: string[];
  weekKey?: string;
};

export function buildParentGrowthNotificationId(input: {
  teamId: string;
  playerId: string;
  type: ParentGrowthNotificationType;
  occurredAt: number;
}): string {
  return `${input.teamId}:${input.playerId}:${input.type}:${input.occurredAt}`;
}
