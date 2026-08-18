/** Sprint D-4.2 — Growth Timeline (playerGrowthHistory 기반) */

export type GrowthTrendDirection = "up" | "down" | "stable";

/** 단일 세션 성장 포인트 — 차트·카드 공통 */
export interface GrowthTimelinePoint {
  sessionId: string;
  score: number;
  /** YYYY-MM-DD (generatedAt 기준) */
  sessionDate: string;
  level?: number;
  ovr?: number;
}

export interface PlayerGrowthTimelineSummary {
  latestScore: number | null;
  previousScore: number | null;
  deltaScore: number | null;
  trendDirection: GrowthTrendDirection;
}

export interface PlayerGrowthTimeline extends PlayerGrowthTimelineSummary {
  teamId: string;
  playerId: string;
  /** 시간순(과거 → 최근) — 차트 렌더용 */
  points: GrowthTimelinePoint[];
  /** 조회 건수 (최대 limit) */
  count: number;
}
