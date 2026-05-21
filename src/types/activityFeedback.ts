import type { Timestamp } from "firebase/firestore";

/**
 * 사용자 → activities 네거티브 피드백 (숨김 / 신고 / 관심없음)
 *
 * 문서 ID: `{userId}_{activityId}_{type}` — 동일 조합 1회만 생성(onCreate 트리거)
 */

export type ActivityFeedbackType = "hide" | "report" | "not_interested";

export interface UserActivityFeedback {
  id: string;
  userId: string;
  activityId: string;
  type: ActivityFeedbackType;
  createdAt?: Timestamp;
}
