/**
 * 🔥 매칭 참여 상태 머신 (대회급 안정성)
 * 
 * 역할:
 * - 상태 전이 규칙 검증
 * - 불가능한 상태 전이 차단
 * - 상태별 허용 액션 정의
 */

import type { JoinStatus } from "./marketJoinService";

/**
 * 상태 전이 규칙 정의
 */
export const JOIN_STATUS_TRANSITIONS: Record<
  JoinStatus,
  { canTransitionTo: JoinStatus[]; description: string }
> = {
  pending: {
    canTransitionTo: [
      "approved",
      "rejected",
      "cancelled_by_user",
      "expired",
    ],
    description: "대기 중 → 승인/거절/취소/만료",
  },
  approved: {
    canTransitionTo: [
      "cancelled_by_user",
      "cancelled_by_author",
      "completed",
      "no_show",
    ],
    description: "승인됨 → 취소/완료/노쇼",
  },
  rejected: {
    canTransitionTo: ["pending"], // 재신청 가능
    description: "거절됨 → 재신청 가능",
  },
  cancelled_by_user: {
    canTransitionTo: ["pending"], // 재신청 가능
    description: "사용자 취소 → 재신청 가능",
  },
  cancelled_by_author: {
    canTransitionTo: ["pending"], // 재신청 가능
    description: "작성자 취소 → 재신청 가능",
  },
  expired: {
    canTransitionTo: ["pending"], // 재신청 가능
    description: "만료됨 → 재신청 가능",
  },
  completed: {
    canTransitionTo: [], // 최종 상태
    description: "완료됨 → 최종 상태",
  },
  no_show: {
    canTransitionTo: [], // 최종 상태
    description: "노쇼 → 최종 상태",
  },
};

/**
 * 상태 전이 가능 여부 확인
 * 
 * @param fromStatus - 현재 상태
 * @param toStatus - 목표 상태
 * @returns 전이 가능 여부
 */
export function canTransitionStatus(
  fromStatus: JoinStatus,
  toStatus: JoinStatus
): boolean {
  const transitions = JOIN_STATUS_TRANSITIONS[fromStatus];
  if (!transitions) {
    return false;
  }

  return transitions.canTransitionTo.includes(toStatus);
}

/**
 * 상태별 허용 액션 정의
 */
export const JOIN_STATUS_ACTIONS: Record<
  JoinStatus,
  {
    userCanCancel: boolean; // 사용자가 취소 가능
    authorCanManage: boolean; // 작성자가 관리 가능
    canReapply: boolean; // 재신청 가능
  }
> = {
  pending: {
    userCanCancel: true,
    authorCanManage: true, // 승인/거절 가능
    canReapply: false,
  },
  approved: {
    userCanCancel: true,
    authorCanManage: true, // 작성자 취소 가능
    canReapply: false,
  },
  rejected: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: true,
  },
  cancelled_by_user: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: true,
  },
  cancelled_by_author: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: true,
  },
  expired: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: true,
  },
  completed: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: false,
  },
  no_show: {
    userCanCancel: false,
    authorCanManage: false,
    canReapply: false,
  },
};

/**
 * 상태 전이 검증
 * 
 * @param fromStatus - 현재 상태
 * @param toStatus - 목표 상태
 * @throws 전이 불가능한 경우 에러
 */
export function validateStatusTransition(
  fromStatus: JoinStatus,
  toStatus: JoinStatus
): void {
  if (!canTransitionStatus(fromStatus, toStatus)) {
    throw new Error(
      `상태 전이 불가능: ${fromStatus} → ${toStatus}. 허용된 전이: ${JOIN_STATUS_TRANSITIONS[fromStatus]?.canTransitionTo.join(", ") || "없음"}`
    );
  }
}
