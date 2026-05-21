/**
 * 🔥 Story Status Model - 상태 확장
 * 
 * Note: StoryStatus는 story.types.ts로 이동됨
 * 이 파일은 상태 전이 규칙만 관리
 */

import type { StoryStatus } from "./story.types";

// 상태 전이 규칙 (보안 강화)
export const STATUS_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  DRAFT: ["REVIEW", "PUBLISHED", "REJECTED"], // DRAFT → REVIEW 추가
  REVIEW: ["PUBLISHED", "REJECTED"], // 검수 대기
  PUBLISHED: ["EXPIRED", "DRAFT", "REJECTED"],
  EXPIRED: ["PUBLISHED", "DRAFT"],
  REJECTED: ["DRAFT"], // 거부된 스토리는 DRAFT로만 복구 가능
};

/**
 * 상태 전이 가능 여부 확인
 */
export function canTransition(
  from: StoryStatus,
  to: StoryStatus
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 발행 가능 상태 확인
 */
export function isPublishable(status: StoryStatus): boolean {
  return status === "DRAFT" || status === "EXPIRED";
}
