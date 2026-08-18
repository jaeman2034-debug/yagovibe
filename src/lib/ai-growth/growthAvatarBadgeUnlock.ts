import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthBadgeId, PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** Sprint D-4.3 — 신규 배지 해제 이벤트 */
export type GrowthBadgeUnlockEvent = {
  playerName: string;
  badgeIds: GrowthBadgeId[];
};

export const BADGE_UNLOCK_RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function detectNewBadgeUnlocks(
  previous: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc
): GrowthBadgeId[] {
  const prev = new Set(previous?.badges ?? []);
  return next.badges.filter((id) => !prev.has(id));
}

export function buildBadgeUnlockEvent(
  previous: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc,
  playerName: string
): GrowthBadgeUnlockEvent | null {
  const badgeIds = detectNewBadgeUnlocks(previous, next);
  if (badgeIds.length === 0) return null;
  return {
    playerName: playerName.trim() || next.playerName || "선수",
    badgeIds,
  };
}

export function applyBadgeUnlockFieldsToAvatar(
  existing: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc
): PlayerGrowthAvatarDoc {
  const newIds = detectNewBadgeUnlocks(existing, next);
  if (newIds.length === 0) {
    return {
      ...next,
      ...(existing?.lastBadgeUnlockAt != null ? { lastBadgeUnlockAt: existing.lastBadgeUnlockAt } : {}),
      ...(existing?.lastUnlockedBadges?.length
        ? { lastUnlockedBadges: existing.lastUnlockedBadges }
        : {}),
    };
  }
  return {
    ...next,
    lastBadgeUnlockAt: Date.now(),
    lastUnlockedBadges: newIds,
  };
}

export function isRecentBadgeUnlock(lastBadgeUnlockAt: number | undefined, now = Date.now()): boolean {
  if (!lastBadgeUnlockAt || !Number.isFinite(lastBadgeUnlockAt)) return false;
  return now - lastBadgeUnlockAt <= BADGE_UNLOCK_RECENT_MS;
}

export function formatBadgeUnlockNotice(event: GrowthBadgeUnlockEvent): string {
  const labels = event.badgeIds.map((id) => badgeMetaById(id).labelKo);
  return `🏅 새 배지 획득: ${labels.join(", ")}`;
}
