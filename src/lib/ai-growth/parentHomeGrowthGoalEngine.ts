import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { ParentHomeGrowthGoal } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";

/** Sprint D-4.4-b / D-5.1 — Parent Home 목표 (Recommendation Engine 래퍼) */
export function buildParentHomeGrowthGoals(
  avatar: PlayerGrowthAvatarDoc,
  maxGoals = 4
): ParentHomeGrowthGoal[] {
  const bundle = buildAvatarGrowthRecommendations(avatar, maxGoals + 1);
  return bundle.recommendations
    .filter((r) => r.kind !== "training_focus")
    .slice(0, maxGoals)
    .map((r) => ({
      id: r.id,
      kind: r.kind === "level" ? "level" : r.kind === "session" ? "session" : "badge",
      emoji: r.emoji,
      label: r.title,
      detail: r.detail.replace(/\n/g, " → "),
    }));
}
