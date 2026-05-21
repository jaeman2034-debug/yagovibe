/**
 * 🔥 Experiment API Contract - AB 테스트 서버 계약
 * 
 * 서버 저장 + 집계 규격
 */

import type { ExperimentKey, Variant } from "./experiment.types";

/**
 * 실험 로그 요청 (POST /api/exp/log)
 */
export interface ExpLogRequest {
  experimentKey: ExperimentKey;
  variant: Variant;
  event: "exp_impression" | "exp_click" | "exp_route";
  surface: "StoryZone" | "ActionGrid";
  
  // 컨텍스트
  storyId?: string;
  category?: string;
  source?: string;
  actionKey?: string;
  
  // 시즌 모드 정보
  mode: "default" | "season";
  decisionReason: string;
  
  at: string;
  
  // 보안
  sessionId: string;
  device: "m" | "pc";
  userId?: string;
}

/**
 * 실험 로그 응답
 */
export interface ExpLogResponse {
  id: string;
  received: boolean;
}

/**
 * 실험 로그 일괄 요청 (POST /api/exp/log/bulk)
 */
export interface ExpLogBulkRequest {
  logs: ExpLogRequest[];
}

/**
 * 실험 로그 일괄 응답
 */
export interface ExpLogBulkResponse {
  received: number;
  failed: number;
}

/**
 * 실험 집계 요청 (GET /api/exp/analytics)
 */
export interface ExpAnalyticsRequest {
  experimentKey: ExperimentKey;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  groupBy?: ("variant" | "mode" | "source" | "surface")[];
}

/**
 * 실험 집계 응답
 */
export interface ExpAnalyticsResponse {
  experimentKey: ExperimentKey;
  period: {
    start: string;
    end: string;
  };
  variants: {
    variant: Variant;
    impression: number;
    click: number;
    ctr: number; // percentage
    route?: number;
    conversion?: number; // route / click
  }[];
  breakdown?: {
    mode?: Record<"default" | "season", ExpAnalyticsResponse["variants"]>;
    source?: Record<string, ExpAnalyticsResponse["variants"]>;
    surface?: Record<string, ExpAnalyticsResponse["variants"]>;
  };
  significance?: {
    winner?: Variant;
    confidence: number; // percentage
    recommendation: "continue" | "stop" | "declare_winner";
  };
}
