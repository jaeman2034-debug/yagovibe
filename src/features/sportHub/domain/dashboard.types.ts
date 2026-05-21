/**
 * 🔥 Dashboard Types - 운영 대시보드 v2 도메인 모델
 * 
 * 지금까지 만든 모든 엔진을 사람이 이해하고 제어하는 관제실
 */

import type { Region } from "./region.types";
import type { Story } from "./story.types";
import type { Campaign } from "./marketing.types";
import type { Settlement } from "./settlement.types";

/**
 * 허브 건강 상태
 */
export type HubHealth = {
  storyFillRate: number;    // 5/5 (100%)
  seasonMode: boolean;
  apiError: number;         // 오늘 API 에러 수
  cacheHitRate: number;     // 캐시 적중률
  avgResponseTime: number;  // 평균 응답 시간 (ms)
};

/**
 * KPI 지표
 */
export type DashboardKPI = {
  storyCTR: number;         // 스토리 클릭률 (%)
  bookingCR: number;        // 예약 전환률 (%)
  revenueToday: number;     // 오늘 매출
  revenueWeek: number;      // 이번 주 매출
  activeUsers: number;       // 활성 사용자
  newUsers: number;         // 신규 사용자
  d1ReturnRate: number;     // D1 재방문률 (%)
};

/**
 * 위험 신호
 */
export type DashboardRisk = {
  lowCTRStories: string[];   // CTR < 1% 스토리 ID
  expiringSoon: string[];   // 24시간 이내 만료 스토리 ID
  paymentFail: number;       // 오늘 결제 실패 수
  apiErrors: number;        // API 에러 수
  emptySlots: number;       // 빈 스토리 슬롯 수
  seasonModeOff: boolean;   // 시즌 모드 꺼짐 (대회 있는데)
};

/**
 * 대시보드 요약
 */
export type DashboardSummary = {
  region: Region;
  health: HubHealth;
  kpi: DashboardKPI;
  risk: DashboardRisk;
  lastUpdated: string;      // ISO string
};

/**
 * 스토리 슬롯 상태
 */
export type StorySlotStatus = {
  slotIndex: number;
  story: Story | null;
  ctr: number;
  impressions: number;
  clicks: number;
  expiresAt: string;
};

/**
 * AB 실험 상태
 */
export type ABExperimentStatus = {
  experimentKey: string;
  campaignId: string;
  variantA: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  variantB: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  winner: "A" | "B" | "tie" | null;
  sampleSize: number;
  confidence: number;        // 신뢰도 (%)
};

/**
 * 정산 요약
 */
export type SettlementSummary = {
  pending: number;           // 대기 중 정산 수
  totalAmount: number;       // 총 정산 금액
  feeTotal: number;          // 총 수수료
  thisWeek: Settlement[];    // 이번 주 정산
  disputes: number;          // 분쟁 건수
};

/**
 * 운영 액션
 */
export type AdminAction =
  | "replace_story"
  | "extend_story"
  | "boost_priority"
  | "end_ab_experiment"
  | "hold_settlement"
  | "force_season_mode";

/**
 * 알림 레벨
 */
export type AlertLevel = "info" | "warning" | "critical";

/**
 * 대시보드 알림
 */
export type DashboardAlert = {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  region?: Region;
  action?: AdminAction;
  createdAt: string;
  acknowledged: boolean;
};
