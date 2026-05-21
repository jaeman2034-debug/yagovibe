/**
 * 🔐 요금제 기능 가드 유틸리티 (v2)
 * 
 * 프론트 + 서버에서 동일한 가드 로직 사용
 */

export type PlanType = "free" | "basic" | "pro";

/**
 * 기능별 필수 플랜
 */
export const FEATURE_PLANS: Record<string, PlanType> = {
  // BASIC 기능
  exportExcel: "basic",
  notificationAutomation: "basic",
  
  // PRO 기능
  paymentIntegration: "pro",
  qrCheckin: "pro",
  advancedReporting: "pro",
  customBranding: "pro",
};

/**
 * 플랜 비교 (필수 플랜 >= 현재 플랜)
 */
const PLAN_LEVELS: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

/**
 * 기능 사용 가능 여부 확인
 */
export function canUseFeature(
  currentPlan: PlanType | undefined,
  featureName: keyof typeof FEATURE_PLANS
): boolean {
  if (!currentPlan) return false;
  
  const requiredPlan = FEATURE_PLANS[featureName];
  if (!requiredPlan) return true; // 플랜 제한 없는 기능
  
  return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[requiredPlan];
}

/**
 * 기능별 에러 메시지
 */
export function getFeatureUpgradeMessage(featureName: keyof typeof FEATURE_PLANS): string {
  const requiredPlan = FEATURE_PLANS[featureName];
  if (!requiredPlan) return "";
  
  const planNames: Record<PlanType, string> = {
    free: "FREE",
    basic: "BASIC",
    pro: "PRO",
  };
  
  return `이 기능은 ${planNames[requiredPlan]} 플랜 이상에서 사용할 수 있습니다.`;
}

/**
 * 플랜별 기능 목록 (UX 표시용)
 */
export function getPlanFeatures(plan: PlanType): string[] {
  const features: Record<PlanType, string[]> = {
    free: [
      "참가 신청 관리",
      "선수 명단 관리",
      "기본 대회 운영",
    ],
    basic: [
      "FREE 플랜 모든 기능",
      "엑셀 다운로드",
      "자동 알림 발송",
      "참가비 관리",
    ],
    pro: [
      "BASIC 플랜 모든 기능",
      "참가비 결제 연동",
      "QR 체크인",
      "고급 리포트",
      "브랜딩 커스터마이징",
    ],
  };
  
  return features[plan] || [];
}
