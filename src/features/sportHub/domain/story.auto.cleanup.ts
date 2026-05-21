/**
 * 🔥 Story Auto Cleanup - 자동 정리 규칙
 * 
 * CTR 기반 하위 이동
 * 0클릭 스토리 제외
 * 만료 전 알림
 */

import type { Story } from "./story.types";
import { calcQualityScore } from "./story.quality";

/**
 * 자동 정리 규칙 타입
 */
export type CleanupAction =
  | { type: "demote"; reason: "low_ctr" | "zero_clicks" }
  | { type: "exclude"; reason: "zero_clicks_3days" }
  | { type: "notify"; reason: "expiring_soon" };

/**
 * 스토리 통계 (로그에서 집계)
 */
export type StoryStats = {
  impression: number;
  click: number;
  createdAt: number; // timestamp
};

/**
 * 자동 정리 액션 결정
 */
export function determineCleanupAction(
  story: Story,
  stats: StoryStats
): CleanupAction | null {
  const now = Date.now();
  const storyAge = now - stats.createdAt;
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  // 1. 3일 이상 0클릭 → 제외
  if (storyAge >= threeDays && stats.click === 0) {
    return { type: "exclude", reason: "zero_clicks_3days" };
  }

  // 2. CTR 1% 미만 → 하위 이동
  const ctr = stats.click / Math.max(stats.impression, 1);
  if (stats.impression >= 100 && ctr < 0.01) {
    return { type: "demote", reason: "low_ctr" };
  }

  // 3. 만료 1일 전 알림
  const endAt = new Date(story.endAt).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (endAt - now <= oneDay && endAt > now) {
    return { type: "notify", reason: "expiring_soon" };
  }

  return null;
}

/**
 * 품질 기반 자동 정리 (배치 처리용)
 */
export function autoCleanupStories(
  stories: Story[],
  statsMap: Map<string, StoryStats>
): {
  demoted: Story[];
  excluded: Story[];
  notified: Story[];
} {
  const demoted: Story[] = [];
  const excluded: Story[] = [];
  const notified: Story[] = [];

  for (const story of stories) {
    const stats = statsMap.get(story.id);
    if (!stats) continue;

    const action = determineCleanupAction(story, stats);
    if (!action) continue;

    switch (action.type) {
      case "demote":
        demoted.push(story);
        break;
      case "exclude":
        excluded.push(story);
        break;
      case "notify":
        notified.push(story);
        break;
    }
  }

  return { demoted, excluded, notified };
}
