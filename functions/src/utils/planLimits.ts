/**
 * 🔥 플랜 제한 판단 유틸 (G단계 LOCK v1)
 * 
 * 초대/합류 시 플랜 체크 + 좌석 제한
 * teams/{teamId}의 seatLimit, seatUsed 필드 사용
 */

export type PlanType = "free" | "pro" | "enterprise";

/**
 * 플랜별 좌석 제한 (G-4)
 */
export function seatLimitByPlan(plan: string): number {
  switch (plan) {
    case "free":
      return 5;
    case "pro":
      return 20;
    case "enterprise":
      return 9999;
    default:
      return 5;
  }
}

