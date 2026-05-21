/**
 * 🔥 Story Operation Rules - 운영 규칙 확정
 * 
 * 확정 정책:
 * - 스토리 입력: 협회 계정 + 관리자 (사용자도 작성 가능, 검수 필수)
 * - 사용자 콘텐츠 검증: 좋아요 기반 + 관리자 승인
 * - 대회 데이터: 직접 입력 (초기)
 */

import type { Story, StorySource } from "./story.types";

// 우선순위 규칙
export const PRIORITY_RULES = {
  운영: { min: 80, max: 100 },
  협회: { min: 70, max: 95 },
  사용자: { min: 0, max: 50 }, // 사용자는 priority 대신 score 사용
} as const;

// 사용자 콘텐츠 검증 기준
export const USER_CONTENT_CRITERIA = {
  // 좋아요 기반 자동 승인 (점수 기준)
  autoApproveScore: 50, // score >= 50이면 자동 승인 가능
  
  // 관리자 승인 필수 조건
  requiresAdminApproval: true, // 모든 사용자 콘텐츠는 초기 pending
  
  // 검증된 작성자 우대
  verifiedAuthorBonus: 20, // 검증된 작성자는 score +20
} as const;

// 스토리 입력 권한
export type StoryInputRole = "admin" | "association" | "user";

export const INPUT_PERMISSIONS: Record<StoryInputRole, {
  canCreate: boolean;
  initialStatus: "published" | "pending";
  requiresApproval: boolean;
}> = {
  admin: {
    canCreate: true,
    initialStatus: "published",
    requiresApproval: false,
  },
  association: {
    canCreate: true,
    initialStatus: "published", // 협회는 신뢰도 높음
    requiresApproval: false,
  },
  user: {
    canCreate: true,
    initialStatus: "pending", // 사용자는 검수 필수
    requiresApproval: true,
  },
};

/**
 * 사용자 콘텐츠 자동 승인 여부 판정
 */
export function canAutoApproveUserStory(story: Story): boolean {
  if (story.source !== "사용자") return false;
  
  // 검증된 작성자 + 점수 기준
  const effectiveScore = (story.score || 0) + 
    (story.isVerifiedAuthor ? USER_CONTENT_CRITERIA.verifiedAuthorBonus : 0);
  
  return effectiveScore >= USER_CONTENT_CRITERIA.autoApproveScore;
}

/**
 * 스토리 우선순위 검증
 */
export function validateStoryPriority(
  source: StorySource,
  priority: number
): boolean {
  const rule = PRIORITY_RULES[source];
  return priority >= rule.min && priority <= rule.max;
}

/**
 * 스토리 입력 권한 확인
 */
export function canCreateStory(role: StoryInputRole): boolean {
  return INPUT_PERMISSIONS[role].canCreate;
}

/**
 * 스토리 초기 상태 결정
 */
export function getInitialStoryStatus(role: StoryInputRole): "published" | "pending" {
  return INPUT_PERMISSIONS[role].initialStatus;
}
