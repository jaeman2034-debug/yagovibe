import type { GrowthBadgeMeta } from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** D-4.4 — Parent Home · Step5 공통 다음 배지 목표 문구 */
export function formatNextBadgeGoalLine(
  badge: GrowthBadgeMeta,
  remaining: number,
  unit: "stat" | "session" | "ovr"
): string {
  if (unit === "session") return `${badge.labelKo} — ${remaining}회 더 훈련`;
  if (unit === "ovr") return `${badge.labelKo} — OVR +${remaining}`;
  return `${badge.labelKo} — +${remaining}`;
}
