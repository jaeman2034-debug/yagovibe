/**
 * 🔥 Story Permission - 권한 모델 및 가드
 * 
 * 사고 방지 아키텍처:
 * - 사용자 글이 스토리 존을 망치지 않게
 * - 협회/운영 권한 명확 분리
 * - API 악용·스팸 차단
 */

import type { Story, StoryStatus } from "./story.types";

/**
 * 역할 타입
 */
export type Role = "GUEST" | "USER" | "ASSOC" | "ADMIN";

/**
 * 권한 매트릭스
 */
export const PERMISSIONS = {
  // 스토리 조회
  VIEW_STORY: (role: Role) => true, // 모든 역할 가능

  // 스토리 작성
  CREATE_STORY: (role: Role) => role !== "GUEST",

  // 즉시 노출
  PUBLISH_IMMEDIATELY: (role: Role) => role === "ADMIN" || role === "ASSOC",

  // 우선순위 조정
  ADJUST_PRIORITY: (role: Role) => role === "ADMIN",

  // 기간 조정
  ADJUST_SCHEDULE: (role: Role) => role === "ADMIN" || role === "ASSOC",

  // 검수
  REVIEW_STORY: (role: Role) => role === "ADMIN",
} as const;

/**
 * 즉시 발행 가능 여부
 */
export function canPublish(role: Role): boolean {
  return PERMISSIONS.PUBLISH_IMMEDIATELY(role);
}

/**
 * 스토리 작성 가드
 */
export function createStoryGuard(role: Role, input: Partial<Story>): {
  status: StoryStatus;
  priority: number;
  valid: boolean;
  reason?: string;
} {
  // 사용자 즉시노출 금지
  if (!canPublish(role)) {
    return {
      status: "REVIEW",
      priority: 0, // 사용자 우선순위 제한
      valid: true,
    };
  }

  // 협회/운영은 즉시 발행 가능
  if (role === "ASSOC" || role === "ADMIN") {
    return {
      status: input.status || "PUBLISHED",
      priority: input.priority ?? (role === "ADMIN" ? 90 : 85),
      valid: true,
    };
  }

  return {
    status: "REVIEW",
    priority: 0,
    valid: true,
  };
}

/**
 * 읽기 가드 (노출 가능한 스토리 필터링)
 */
export function visibleStories(role: Role, stories: Story[]): Story[] {
  // 관리자는 모든 스토리 조회 가능
  if (role === "ADMIN") {
    return stories;
  }

  // 일반 사용자는 PUBLISHED만 조회
  return stories.filter((s) => s.status === "PUBLISHED");
}

/**
 * 수정 권한 확인
 */
export function canEditStory(role: Role, story: Story): boolean {
  // 관리자는 모든 스토리 수정 가능
  if (role === "ADMIN") return true;

  // 협회는 자신의 스토리만 수정 가능
  if (role === "ASSOC" && story.source === "협회") return true;

  // 사용자는 자신의 스토리만 수정 가능 (DRAFT/REVIEW 상태만)
  if (role === "USER" && story.source === "사용자") {
    return story.status === "DRAFT" || story.status === "REVIEW";
  }

  return false;
}

/**
 * 삭제 권한 확인
 */
export function canDeleteStory(role: Role, story: Story): boolean {
  // 관리자는 모든 스토리 삭제 가능
  if (role === "ADMIN") return true;

  // 협회/사용자는 자신의 스토리만 삭제 가능
  if (role === "ASSOC" && story.source === "협회") return true;
  if (role === "USER" && story.source === "사용자") return true;

  return false;
}
