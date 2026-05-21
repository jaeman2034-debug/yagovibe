/**
 * 🔥 대회 운영 요금제 가드 유틸리티
 * 
 * 프론트엔드에서 요금제별 기능 접근 제어
 */

import type { TournamentPlanType } from "@/types/tournamentPlan";
import { hasTournamentFeature } from "@/types/tournamentPlan";

/**
 * 엑셀 Export 가능 여부
 */
export function canExportExcel(plan: TournamentPlanType): boolean {
  return hasTournamentFeature(plan, "allowExcelExport");
}

/**
 * 알림 자동화 가능 여부
 */
export function canUseNotificationAutomation(plan: TournamentPlanType): boolean {
  return hasTournamentFeature(plan, "allowNotificationAutomation");
}

/**
 * 결제 연동 가능 여부
 */
export function canUsePaymentIntegration(plan: TournamentPlanType): boolean {
  return hasTournamentFeature(plan, "allowPaymentIntegration");
}

/**
 * QR 체크인 가능 여부
 */
export function canUseQrCheckin(plan: TournamentPlanType): boolean {
  return hasTournamentFeature(plan, "allowQrCheckin");
}

/**
 * 커스텀 브랜딩 가능 여부 (플랫폼 로고 제거)
 */
export function canUseCustomBranding(plan: TournamentPlanType): boolean {
  return hasTournamentFeature(plan, "allowCustomBranding");
}

/**
 * 대회 생성 가능 여부 (대회 수 제한 체크)
 */
export function canCreateTournament(
  plan: TournamentPlanType,
  currentTournamentCount: number
): boolean {
  const limits = {
    free: 1,
    basic: Infinity,
    pro: Infinity,
  };
  const maxTournaments = limits[plan] || 1;
  return currentTournamentCount < maxTournaments;
}

/**
 * 업그레이드 필요 여부 체크
 */
export function needsUpgrade(
  plan: TournamentPlanType,
  feature: keyof import("@/types/tournamentPlan").TournamentPlanLimits
): boolean {
  return !hasTournamentFeature(plan, feature);
}
