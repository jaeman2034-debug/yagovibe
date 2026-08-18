import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** Sprint D-4.1 — Level Up 감지 · Avatar 필드 병합 */
export type GrowthLevelUpEvent = {
  playerName: string;
  previousLevel: number;
  currentLevel: number;
  previousOvr: number;
  currentOvr: number;
};

export const LEVEL_UP_RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function detectGrowthLevelUp(input: {
  previousLevel: number | null | undefined;
  currentLevel: number;
}): boolean {
  if (typeof input.previousLevel !== "number") return false;
  return input.currentLevel > input.previousLevel;
}

export function isRecentLevelUp(lastLevelUpAt: number | undefined, now = Date.now()): boolean {
  if (!lastLevelUpAt || !Number.isFinite(lastLevelUpAt)) return false;
  return now - lastLevelUpAt <= LEVEL_UP_RECENT_MS;
}

/** Firestore/Admin 숫자 필드 (number · int64) */
export function readGrowthAvatarNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Math.round(Number(v));
  }
  return null;
}

/** Step5 저장 직전 스냅샷 우선 — CF 선행 쓰기 레이스 방지 */
export function resolvePreviousAvatarForLevelUp(
  liveExisting: PlayerGrowthAvatarDoc | null,
  snapshotBeforeSave?: PlayerGrowthAvatarDoc | null
): PlayerGrowthAvatarDoc | null {
  if (!snapshotBeforeSave) return liveExisting;
  if (!liveExisting) return snapshotBeforeSave;
  if (snapshotBeforeSave.level < liveExisting.level) return snapshotBeforeSave;
  if (snapshotBeforeSave.level > liveExisting.level) return liveExisting;
  return snapshotBeforeSave.updatedAt <= liveExisting.updatedAt ? snapshotBeforeSave : liveExisting;
}

export function applyLevelUpFieldsToAvatar(
  existing: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc,
  options?: { snapshotBeforeSave?: PlayerGrowthAvatarDoc | null }
): PlayerGrowthAvatarDoc {
  const previous = resolvePreviousAvatarForLevelUp(existing, options?.snapshotBeforeSave);

  if (!previous || previous.level >= next.level) {
    return {
      ...next,
      ...(previous?.lastLevel != null ? { lastLevel: previous.lastLevel } : {}),
      ...(previous?.lastLevelUpAt != null ? { lastLevelUpAt: previous.lastLevelUpAt } : {}),
      ...(previous?.lastOvr != null ? { lastOvr: previous.lastOvr } : {}),
      ...(existing?.lastLevel != null && previous?.lastLevel == null
        ? { lastLevel: existing.lastLevel }
        : {}),
      ...(existing?.lastLevelUpAt != null && previous?.lastLevelUpAt == null
        ? { lastLevelUpAt: existing.lastLevelUpAt }
        : {}),
      ...(existing?.lastOvr != null && previous?.lastOvr == null ? { lastOvr: existing.lastOvr } : {}),
    };
  }

  return {
    ...next,
    lastLevel: previous.level,
    lastLevelUpAt: Date.now(),
    lastOvr: previous.ovr,
  };
}

export function buildLevelUpEvent(
  existing: PlayerGrowthAvatarDoc | null,
  next: PlayerGrowthAvatarDoc,
  playerName: string,
  options?: { snapshotBeforeSave?: PlayerGrowthAvatarDoc | null }
): GrowthLevelUpEvent | null {
  const previous = resolvePreviousAvatarForLevelUp(existing, options?.snapshotBeforeSave);
  if (!detectGrowthLevelUp({ previousLevel: previous?.level, currentLevel: next.level })) {
    return null;
  }
  return {
    playerName,
    previousLevel: previous!.level,
    currentLevel: next.level,
    previousOvr: previous!.ovr,
    currentOvr: next.ovr,
  };
}
