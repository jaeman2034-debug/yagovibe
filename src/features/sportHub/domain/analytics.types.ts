/**
 * 🔥 Analytics Types - 데이터 분석 레이어 도메인 모델
 * 
 * 이벤트 택소노미 (단일 표준)
 */

import type { Region } from "./region.types";

/**
 * 이벤트 공통 필드 (필수)
 */
export type EventBase = {
  eventName: string;          // ex) story_impression
  at: string;                 // ISO string
  sessionId: string;
  userId?: string | null;
  region: Region;
  device: "m" | "pc";
  appVersion?: string;

  // 네트워크/품질
  network?: "offline" | "slow" | "normal";
  from?: "api" | "seed" | "cache";

  // 실험 컨텍스트
  experimentKey?: string;
  variant?: "A" | "B";

  // 시즌 컨텍스트
  mode?: "default" | "season";
  decisionReason?: string;
};

/**
 * 핵심 이벤트 세트
 */
export type AnalyticsEvent =
  // 허브
  | { eventName: "hub_view"; metadata?: { page?: string } }
  
  // 스토리
  | { eventName: "story_impression"; metadata: { storyId: string; category: string; source: string } }
  | { eventName: "story_click"; metadata: { storyId: string; category: string; source: string } }
  | { eventName: "story_route"; metadata: { storyId: string; route: string } }
  
  // AB 테스트
  | { eventName: "exp_impression"; metadata: { experimentKey: string; variant: "A" | "B" } }
  | { eventName: "exp_click"; metadata: { experimentKey: string; variant: "A" | "B" } }
  
  // 구장 예약/결제
  | { eventName: "ground_view"; metadata: { groundId: string } }
  | { eventName: "slot_select"; metadata: { slotId: string; groundId: string; price: number } }
  | { eventName: "reserve_create"; metadata: { reservationId: string; amount: number } }
  | { eventName: "payment_request"; metadata: { reservationId: string; amount: number; pg: string } }
  | { eventName: "payment_success"; metadata: { reservationId: string; amount: number; pg: string } }
  | { eventName: "payment_fail"; metadata: { reservationId: string; amount: number; reason: string } }
  
  // 정산
  | { eventName: "settlement_created"; metadata: { settlementId: string; ownerId: string; amount: number } }
  | { eventName: "settlement_paid"; metadata: { settlementId: string; amount: number } }
  | { eventName: "settlement_hold"; metadata: { settlementId: string; reason: string } }
  
  // 커뮤니티
  | { eventName: "team_join_request"; metadata: { teamId: string; userId: string } }
  | { eventName: "team_join_approved"; metadata: { teamId: string; userId: string } }
  | { eventName: "league_match_created"; metadata: { leagueId: string; matchId: string } }
  
  // 시스템
  | { eventName: "api_error"; metadata: { endpoint: string; status: number; error: string } }
  | { eventName: "seed_fallback"; metadata: { reason: string } }
  | { eventName: "offline_detected"; metadata?: Record<string, any> };

/**
 * 완전한 이벤트 (EventBase + AnalyticsEvent)
 */
export type CompleteEvent = EventBase & AnalyticsEvent;

/**
 * Daily KPI 집계 (확정 스펙)
 */
export type DailyKpi = {
  date: string;            // YYYY-MM-DD
  region: Region;

  story: {
    imp: number;           // story_impression
    click: number;         // story_click
    ctr: number;           // click / imp
  };

  booking: {
    start: number;         // reserve_create
    success: number;       // payment_success
    fail: number;         // payment_fail
    cr: number;            // success / start
  };

  revenue: number;         // sum(payment_success.amount)

  health: {
    seedRate: number;      // from='seed' / all
    offlineRate: number;   // network='offline' / all
    apiError: number;      // api_error count
    storyFillRate: number; // 5/5 (0.0-1.0)
  };

  ab: {
    activeTests: number;   // 진행 중인 AB 테스트 수
    winRate: number;       // 승자 결정된 비율 (0.0-1.0)
  };

  // 추가 지표 (선택)
  community?: {
    teamJoinRequest: number;
    teamJoinApproved: number;
    leagueMatchCreated: number;
  };

  hub?: {
    view: number;
    viewUnique: number;
  };
};

/**
 * Funnel 단계
 */
export type FunnelStep =
  | "hub_view"
  | "story_impression"
  | "story_click"
  | "ground_view"
  | "slot_select"
  | "reserve_create"
  | "payment_success";

/**
 * Funnel 분석 결과
 */
export type FunnelAnalysis = {
  region: Region;
  date: string;
  steps: Array<{
    step: FunnelStep;
    count: number;
    conversionRate: number; // 이전 단계 대비
  }>;
  totalConversion: number; // 첫 단계 대비 최종 전환률
};
