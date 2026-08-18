import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { resolvePreviousAvatarForLevelUp } from "@/lib/ai-growth/growthAvatarLevelUp";
import { PARENT_GROWTH_NOTIFICATION_WINDOW_MS } from "@/lib/ai-growth/parentGrowthNotificationTypes";

/** Sprint D-5.2 — OVR 마일스톤 밴드 (Parent 알림용) */
export const OVR_MILESTONE_BANDS = [80, 85, 90, 95] as const;

export type GrowthOvrMilestoneEvent = {
  playerName: string;
  fromOvr: number;
  toOvr: number;
};

export function detectOvrMilestoneJump(
  previous: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc
): { from: number; to: number } | null {
  if (!previous) return null;
  const from = previous.ovr;
  const to = next.ovr;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;

  const crossedBand = OVR_MILESTONE_BANDS.some((band) => from < band && to >= band);
  if (crossedBand) return { from, to };

  if (to - from >= 5) return { from, to };

  return null;
}

export function isRecentOvrMilestone(
  lastOvrMilestoneAt: number | undefined,
  now = Date.now()
): boolean {
  if (!lastOvrMilestoneAt || !Number.isFinite(lastOvrMilestoneAt)) return false;
  return now - lastOvrMilestoneAt <= PARENT_GROWTH_NOTIFICATION_WINDOW_MS;
}

export function applyOvrMilestoneFieldsToAvatar(
  existing: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc,
  options?: { snapshotBeforeSave?: PlayerGrowthAvatarDoc | null }
): PlayerGrowthAvatarDoc {
  const previous = resolvePreviousAvatarForLevelUp(existing, options?.snapshotBeforeSave);
  const jump = detectOvrMilestoneJump(previous, next);

  if (!jump) {
    return {
      ...next,
      ...(existing?.lastOvrMilestoneAt != null
        ? { lastOvrMilestoneAt: existing.lastOvrMilestoneAt }
        : {}),
      ...(existing?.lastOvrMilestoneFrom != null
        ? { lastOvrMilestoneFrom: existing.lastOvrMilestoneFrom }
        : {}),
      ...(existing?.lastOvrMilestoneTo != null ? { lastOvrMilestoneTo: existing.lastOvrMilestoneTo } : {}),
    };
  }

  return {
    ...next,
    lastOvrMilestoneAt: Date.now(),
    lastOvrMilestoneFrom: jump.from,
    lastOvrMilestoneTo: jump.to,
  };
}

export function buildOvrMilestoneEvent(
  existing: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc,
  playerName: string,
  options?: { snapshotBeforeSave?: PlayerGrowthAvatarDoc | null }
): GrowthOvrMilestoneEvent | null {
  const previous = resolvePreviousAvatarForLevelUp(existing, options?.snapshotBeforeSave);
  const jump = detectOvrMilestoneJump(previous, next);
  if (!jump) return null;
  return {
    playerName: playerName.trim() || next.playerName || "선수",
    fromOvr: jump.from,
    toOvr: jump.to,
  };
}
