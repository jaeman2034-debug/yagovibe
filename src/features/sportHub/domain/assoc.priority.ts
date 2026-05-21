/**
 * 🔥 Association Priority - 우선순위 자동 규칙
 * 
 * 마감 임박 보정
 */

import type { Story } from "./story.types";

/**
 * 남은 일수 계산
 */
function daysLeft(endAt: string): number {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diff = end - now;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * 우선순위 부스트 (마감 임박 보정)
 */
export function priorityBoost(story: Story): Story {
  // 협회 스토리만 적용
  if (story.source !== "협회") return story;
  
  const days = daysLeft(story.endAt);
  let boost = 0;
  
  // 마감 임박 보정
  if (days <= 1) {
    boost = 20; // D-1: +20
  } else if (days <= 3) {
    boost = 10; // D-3: +10
  }
  
  if (boost > 0) {
    return {
      ...story,
      priority: Math.min((story.priority || 0) + boost, 100),
    };
  }
  
  return story;
}

/**
 * 스토리 배열에 우선순위 부스트 적용
 */
export function applyPriorityBoost(stories: Story[]): Story[] {
  return stories.map(priorityBoost);
}
