/**
 * 🔥 대회 운영 요금제 타입 정의
 * 
 * 기존 plan.ts는 팀 관리용, 이것은 대회 운영용
 */

export type TournamentPlanType = "free" | "basic" | "pro";

export interface TournamentPlanLimits {
  // 대회 수 제한
  maxTournaments: number; // Infinity = 무제한
  
  // 기능 제한
  allowExcelExport: boolean;
  allowNotificationAutomation: boolean;
  allowPaymentIntegration: boolean;
  allowQrCheckin: boolean;
  allowCustomBranding: boolean; // 플랫폼 로고 제거
  
  // 알림 제한
  allowApprovalNotification: boolean;
  allowRosterReminder: boolean;
  allowDeadlineNotification: boolean;
}

export const TOURNAMENT_PLAN_LIMITS: Record<TournamentPlanType, TournamentPlanLimits> = {
  free: {
    maxTournaments: 1,
    allowExcelExport: false,
    allowNotificationAutomation: false,
    allowPaymentIntegration: false,
    allowQrCheckin: false,
    allowCustomBranding: false,
    allowApprovalNotification: false,
    allowRosterReminder: false,
    allowDeadlineNotification: false,
  },
  basic: {
    maxTournaments: Infinity, // 무제한
    allowExcelExport: true,
    allowNotificationAutomation: true,
    allowPaymentIntegration: false,
    allowQrCheckin: false,
    allowCustomBranding: true,
    allowApprovalNotification: true,
    allowRosterReminder: true,
    allowDeadlineNotification: true,
  },
  pro: {
    maxTournaments: Infinity, // 무제한
    allowExcelExport: true,
    allowNotificationAutomation: true,
    allowPaymentIntegration: true,
    allowQrCheckin: true,
    allowCustomBranding: true,
    allowApprovalNotification: true,
    allowRosterReminder: true,
    allowDeadlineNotification: true,
  },
};

/**
 * 요금제별 가격 정보
 */
export const TOURNAMENT_PLAN_PRICES: Record<TournamentPlanType, {
  monthly?: number;
  perCompetition?: number;
  description: string;
}> = {
  free: {
    description: "무료로 시작하세요",
  },
  basic: {
    monthly: 49000,
    perCompetition: 99000,
    description: "실제 대회 운영에 필요한 최소 세트",
  },
  pro: {
    monthly: 149000,
    description: "운영 자동화 풀옵션",
  },
};

/**
 * 플랜 기능 체크 헬퍼
 */
export function hasTournamentFeature(
  plan: TournamentPlanType,
  feature: keyof TournamentPlanLimits
): boolean {
  return TOURNAMENT_PLAN_LIMITS[plan]?.[feature] ?? false;
}

/**
 * 플랜 이름 반환
 */
export function getTournamentPlanName(plan: TournamentPlanType): string {
  const names: Record<TournamentPlanType, string> = {
    free: "FREE",
    basic: "BASIC",
    pro: "PRO",
  };
  return names[plan] || "FREE";
}

/**
 * 플랜 설명 반환
 */
export function getTournamentPlanDescription(plan: TournamentPlanType): string {
  const descriptions: Record<TournamentPlanType, string> = {
    free: "대회 1개, 기본 기능만",
    basic: "대회 무제한, 엑셀 Export, 알림 자동화",
    pro: "전체 기능, 결제 연동, 현장 체크인",
  };
  return descriptions[plan] || "";
}
