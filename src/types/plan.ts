/**
 * 🔥 플랜 타입 정의
 */

export type PlanType = "free" | "pro" | "academy_pro";

export interface PlanLimits {
  maxMembers: number;
  maxAdmins: number;
  allowAutoNotification: boolean;
  allowPaymentLinks: boolean;
  allowAttendanceStats: boolean;
  allowMultipleAdmins: boolean;
  allowAdvancedReports: boolean;
  allowCustomBranding: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxMembers: 20,
    maxAdmins: 1,
    allowAutoNotification: false,
    allowPaymentLinks: false,
    allowAttendanceStats: false,
    allowMultipleAdmins: false,
    allowAdvancedReports: false,
    allowCustomBranding: false,
  },
  pro: {
    maxMembers: 100,
    maxAdmins: 10,
    allowAutoNotification: true,
    allowPaymentLinks: true,
    allowAttendanceStats: true,
    allowMultipleAdmins: true,
    allowAdvancedReports: true,
    allowCustomBranding: false,
  },
  academy_pro: {
    maxMembers: 500,
    maxAdmins: 20,
    allowAutoNotification: true,
    allowPaymentLinks: true,
    allowAttendanceStats: true,
    allowMultipleAdmins: true,
    allowAdvancedReports: true,
    allowCustomBranding: true,
  },
};

/**
 * 플랜 기능 체크 헬퍼
 */
export function hasFeature(plan: PlanType, feature: keyof PlanLimits): boolean {
  return PLAN_LIMITS[plan]?.[feature] ?? false;
}

/**
 * 플랜 이름 표시
 */
export function getPlanDisplayName(plan: PlanType): string {
  const names: Record<PlanType, string> = {
    free: "Free",
    pro: "Pro",
    academy_pro: "Academy Pro",
  };
  return names[plan] || "Free";
}
