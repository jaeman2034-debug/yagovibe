/**
 * Badges: catalog entries (code/config) vs per-user unlock state `badges/{uid}`.
 */

import type { Timestamp } from "firebase/firestore";

/** Static or remote-configurable badge definition (not necessarily a Firestore doc). */
export interface BadgeDefinition {
  badgeId: string;
  title: string;
  description?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum" | string;
  /** Optional art for client rendering */
  iconUrl?: string;
}

/** PR-6: Functions가 쓰는 단일 해제 항목 */
export interface UnlockedBadgeEntry {
  unlockedAt: Timestamp;
  source?: string;
  context?: Record<string, unknown>;
}

/** PR-6: XP 소스별 누적(배지 조건용, Functions 전용 쓰기) */
export interface UserBadgeXpStats {
  membershipXpGrants: number;
  rsvpXpGrants: number;
  inviteXpGrants: number;
  activityXpGrants: number;
}

/**
 * Firestore `badges/{uid}` — Functions만 create/update; 클라는 읽기만.
 * `unlocked`는 badgeId → 메타 맵 (중복 해제 방지).
 */
export interface UserBadgesDoc {
  schemaVersion: number;
  uid: string;
  stats: UserBadgeXpStats;
  unlocked: Record<string, UnlockedBadgeEntry>;
  updatedAt: Timestamp;
}
