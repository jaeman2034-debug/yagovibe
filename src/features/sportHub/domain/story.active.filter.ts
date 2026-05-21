/**
 * 🔥 Story Active Filter - ActiveNow 필터
 * 
 * PUBLISHED + 기간 내인 것만 엔진 입력으로 들어가게 잠금
 */

import type { Story } from "./story.types";

/**
 * 현재 활성화된 스토리 확인
 * 
 * @param story - 스토리 객체
 * @param now - 기준 시간 (기본: 현재)
 * @returns 활성화 여부
 */
export function isActiveNow(story: Story, now: Date = new Date()): boolean {
  // PUBLISHED 상태만
  if (story.status !== "PUBLISHED") return false;

  // 기간 확인
  const start = new Date(story.startAt).getTime();
  const end = new Date(story.endAt).getTime();
  const t = now.getTime();

  return start <= t && t <= end;
}

/**
 * 활성화된 스토리만 필터링
 */
export function filterActiveStories(
  stories: Story[],
  now: Date = new Date()
): Story[] {
  return stories.filter((story) => isActiveNow(story, now));
}
