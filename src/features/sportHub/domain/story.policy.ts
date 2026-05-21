/**
 * 🔥 Story Policy - 운영 가드 (안전 장치)
 * 
 * 금지어, 중복 스토리, 기간 충돌 검증
 */

import type { Story, StorySource } from "./story.types";

/**
 * 금지어 목록 (스팸 방어)
 */
export const bannedWords = [
  "광고",
  "도박",
  "불법",
  "사기",
  "허위",
  "대출",
  "성인",
  "도박사이트",
];

/**
 * 스팸 단어 목록
 */
export const spamWords = [
  "도박",
  "불법",
  "대출",
  "무료충전",
  "확률조작",
];

/**
 * 스토리 정책 검증
 */
export function validateStoryPolicy(s: Story): {
  valid: boolean;
  reason?: string;
} {
  // 1. 금지어 검사
  const hasBannedWord = bannedWords.some((word) =>
    s.title.includes(word) || s.subtitle.includes(word)
  );
  if (hasBannedWord) {
    return { valid: false, reason: "금지어 포함" };
  }

  // 2. 길이 검사
  if (s.title.length > 40) {
    return { valid: false, reason: "제목 40자 초과" };
  }
  if (s.subtitle.length > 60) {
    return { valid: false, reason: "서브 60자 초과" };
  }

  // 3. 필수 필드 검사
  if (!s.title.trim() || !s.subtitle.trim()) {
    return { valid: false, reason: "필수 필드 누락" };
  }

  // 4. 기간 검사
  const start = new Date(s.startAt).getTime();
  const end = new Date(s.endAt).getTime();
  if (end <= start) {
    return { valid: false, reason: "종료일이 시작일보다 이전" };
  }

  return { valid: true };
}

/**
 * 스팸 검사
 */
export function spamCheck(s: Story): {
  valid: boolean;
  reason?: string;
} {
  const text = `${s.title} ${s.subtitle}`.toLowerCase();

  // 스팸 단어 검사
  const hasSpamWord = spamWords.some((word) => text.includes(word.toLowerCase()));
  if (hasSpamWord) {
    return { valid: false, reason: "스팸 단어 포함" };
  }

  // 금지어 검사
  const hasBannedWord = bannedWords.some((word) => text.includes(word.toLowerCase()));
  if (hasBannedWord) {
    return { valid: false, reason: "금지어 포함" };
  }

  return { valid: true };
}

/**
 * 중복 스토리 검사 (제목 기준)
 */
export function hasDuplicateStory(
  newStory: Story,
  existingStories: Story[]
): boolean {
  const normalizedTitle = newStory.title.trim().toLowerCase();
  return existingStories.some(
    (s) => s.id !== newStory.id && s.title.trim().toLowerCase() === normalizedTitle
  );
}

/**
 * 기간 충돌 검사 (동일 카테고리 내)
 */
export function hasScheduleConflict(
  newStory: Story,
  existingStories: Story[]
): boolean {
  const sameCategory = existingStories.filter(
    (s) => s.id !== newStory.id && s.category === newStory.category
  );

  const newStart = new Date(newStory.startAt).getTime();
  const newEnd = new Date(newStory.endAt).getTime();

  return sameCategory.some((s) => {
    const start = new Date(s.startAt).getTime();
    const end = new Date(s.endAt).getTime();

    // 겹치는 기간이 있는지 확인
    return !(newEnd < start || newStart > end);
  });
}
