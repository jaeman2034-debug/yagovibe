import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

/** D-4.4 — Parent Home 대표 자녀 후보 (avatar 필수) */
export type ParentGrowthChildCandidate = {
  teamId: string;
  playerId: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
};

function avatarRecencyMs(avatar: PlayerGrowthAvatarDoc): number {
  return Math.max(avatar.syncedFromOvrAt ?? 0, avatar.updatedAt ?? 0);
}

/**
 * Growth Card v2 대표 자녀 선택.
 * sessionCount만 쓰면 김민준(13)이 홍길동(10)보다 항상 앞서므로,
 * 최근 동기화 · OVR · sessionCount 순으로 정렬한다.
 */
export function compareParentGrowthChildCandidates(
  a: ParentGrowthChildCandidate,
  b: ParentGrowthChildCandidate
): number {
  const recencyDiff = avatarRecencyMs(b.avatar) - avatarRecencyMs(a.avatar);
  if (recencyDiff !== 0) return recencyDiff;

  const ovrDiff = (b.avatar.ovr ?? 0) - (a.avatar.ovr ?? 0);
  if (ovrDiff !== 0) return ovrDiff;

  const sessionDiff = (b.avatar.sessionCount ?? 0) - (a.avatar.sessionCount ?? 0);
  if (sessionDiff !== 0) return sessionDiff;

  return (b.timeline?.count ?? 0) - (a.timeline?.count ?? 0);
}

export function pickPrimaryParentGrowthChild<T extends ParentGrowthChildCandidate>(
  candidates: T[]
): T | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareParentGrowthChildCandidates)[0] ?? null;
}
