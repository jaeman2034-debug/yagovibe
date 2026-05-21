/**
 * 🔥 Usage 타입 정의 (Functions 전용)
 * 
 * Usage 모델: /teams/{teamId}/usage/current
 * - 월 단위 단일 문서
 * - 서버에서만 업데이트
 */

export interface TeamUsage {
  membersCount: number;
  actionsThisMonth: number;
  storageMB: number;
  updatedAt: any; // Firestore Timestamp
}

export interface UsageLimits {
  membersCount: number;
  actionsThisMonth: number;
  storageMB: number;
}

export interface UsageCheckResult {
  ok: boolean;
  reason?: "MEMBER_LIMIT" | "ACTION_LIMIT" | "STORAGE_LIMIT";
  limit?: UsageLimits;
  current?: TeamUsage;
}

/**
 * Free / Pro 제한값 정의
 */
export const USAGE_LIMITS: Record<"free" | "pro" | "academy_pro", UsageLimits> = {
  free: {
    membersCount: 5,
    actionsThisMonth: 1000,
    storageMB: 500,
  },
  pro: {
    membersCount: Infinity, // 무제한
    actionsThisMonth: 50000,
    storageMB: 10240, // 10GB
  },
  academy_pro: {
    membersCount: Infinity,
    actionsThisMonth: 100000,
    storageMB: 51200, // 50GB
  },
};

