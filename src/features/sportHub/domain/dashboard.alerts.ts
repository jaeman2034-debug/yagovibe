/**
 * 🔥 Dashboard Alerts - 알림 규칙
 * 
 * 위험 신호를 10초 안에 발견
 */

import type { DashboardAlert, AlertLevel, AdminAction } from "./dashboard.types";
import type { DashboardRisk, HubHealth } from "./dashboard.types";
import type { Region } from "./region.types";

/**
 * 알림 생성
 */
export function createAlert(
  level: AlertLevel,
  title: string,
  message: string,
  region?: Region,
  action?: AdminAction
): DashboardAlert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    level,
    title,
    message,
    region,
    action,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
}

/**
 * 위험 신호 기반 알림 생성
 */
export function generateRiskAlerts(
  risk: DashboardRisk,
  region: Region
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  
  // CTR < 1% 스토리
  if (risk.lowCTRStories.length > 0) {
    alerts.push(
      createAlert(
        "warning",
        "낮은 CTR 스토리",
        `${risk.lowCTRStories.length}개 스토리의 CTR이 1% 미만입니다`,
        region,
        "replace_story"
      )
    );
  }
  
  // 만료 임박 스토리
  if (risk.expiringSoon.length > 0) {
    alerts.push(
      createAlert(
        "warning",
        "만료 임박 스토리",
        `${risk.expiringSoon.length}개 스토리가 24시간 이내 만료됩니다`,
        region,
        "extend_story"
      )
    );
  }
  
  // 결제 실패 급증
  if (risk.paymentFail > 10) {
    alerts.push(
      createAlert(
        "critical",
        "결제 실패 급증",
        `오늘 결제 실패가 ${risk.paymentFail}건 발생했습니다`,
        region
      )
    );
  }
  
  // API 에러
  if (risk.apiErrors > 5) {
    alerts.push(
      createAlert(
        "critical",
        "API 에러 발생",
        `오늘 API 에러가 ${risk.apiErrors}건 발생했습니다`,
        region
      )
    );
  }
  
  // 빈 슬롯
  if (risk.emptySlots > 0) {
    alerts.push(
      createAlert(
        "warning",
        "빈 스토리 슬롯",
        `${risk.emptySlots}개 슬롯이 비어있습니다`,
        region,
        "replace_story"
      )
    );
  }
  
  // 시즌 모드 불일치
  if (risk.seasonModeOff) {
    alerts.push(
      createAlert(
        "warning",
        "시즌 모드 불일치",
        "진행 중인 대회가 있는데 시즌 모드가 꺼져있습니다",
        region,
        "force_season_mode"
      )
    );
  }
  
  return alerts;
}

/**
 * 건강 상태 기반 알림 생성
 */
export function generateHealthAlerts(
  health: HubHealth,
  region: Region
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  
  // 스토리 채움률 낮음
  if (health.storyFillRate < 80) {
    alerts.push(
      createAlert(
        "warning",
        "스토리 채움률 낮음",
        `스토리 채움률이 ${health.storyFillRate.toFixed(1)}%입니다`,
        region,
        "replace_story"
      )
    );
  }
  
  // API 에러
  if (health.apiError > 3) {
    alerts.push(
      createAlert(
        "critical",
        "API 에러 발생",
        `오늘 API 에러가 ${health.apiError}건 발생했습니다`,
        region
      )
    );
  }
  
  // 응답 시간 느림
  if (health.avgResponseTime > 2000) {
    alerts.push(
      createAlert(
        "warning",
        "응답 시간 느림",
        `평균 응답 시간이 ${health.avgResponseTime}ms입니다`,
        region
      )
    );
  }
  
  return alerts;
}

/**
 * 정보 알림 생성
 */
export function generateInfoAlerts(
  events: Array<{
    type: "season_switch" | "league_added" | "settlement_completed";
    message: string;
  }>,
  region: Region
): DashboardAlert[] {
  return events.map((event) =>
    createAlert("info", event.type, event.message, region)
  );
}
