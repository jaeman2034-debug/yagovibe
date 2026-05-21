/**
 * 🔥 Analytics Health - 허브 건강도 자동 계산
 * 
 * 스토리 슬롯 충족률, seed fallback 비율, 결제 실패율, 오프라인 비율
 */

import type { DailyKpi } from "./analytics.types";

/**
 * 허브 건강도 점수 (0-100)
 */
export type HealthScore = {
  overall: number;          // 종합 점수
  storyFill: number;        // 스토리 슬롯 충족률 (0-100)
  seedFallback: number;     // seed fallback 비율 (낮을수록 좋음, 0-100)
  paymentFailure: number;   // 결제 실패율 (낮을수록 좋음, 0-100)
  offlineRate: number;      // 오프라인 비율 (낮을수록 좋음, 0-100)
  apiStability: number;     // API 안정성 (0-100)
};

/**
 * 허브 건강도 계산
 */
export function calculateHealthScore(
  kpi: DailyKpi,
  storySlotCount: number = 5,
  totalEvents: number = 1000
): HealthScore {
  // 1. 스토리 슬롯 충족률 (40점)
  // storyImp가 충분하면 슬롯이 채워진 것으로 간주
  const storyFill = Math.min((kpi.storyImp / (storySlotCount * 100)) * 100, 100);

  // 2. Seed fallback 비율 (20점)
  // seedFallback이 낮을수록 좋음
  const seedFallbackScore = Math.max(0, 100 - (kpi.seedFallback / totalEvents) * 100 * 20);

  // 3. 결제 실패율 (20점)
  // paymentFail이 낮을수록 좋음
  const totalPayments = kpi.paymentSuccess + kpi.paymentFail;
  const paymentFailureScore =
    totalPayments > 0
      ? Math.max(0, 100 - (kpi.paymentFail / totalPayments) * 100 * 20)
      : 100;

  // 4. 오프라인 비율 (10점)
  // offlineRate가 낮을수록 좋음
  const offlineScore = Math.max(0, 100 - kpi.offlineRate * 10);

  // 5. API 안정성 (10점)
  // apiError가 낮을수록 좋음
  const apiStabilityScore = Math.max(0, 100 - (kpi.apiError / totalEvents) * 100 * 10);

  // 종합 점수 (가중 평균)
  const overall =
    storyFill * 0.4 +
    seedFallbackScore * 0.2 +
    paymentFailureScore * 0.2 +
    offlineScore * 0.1 +
    apiStabilityScore * 0.1;

  return {
    overall: Math.round(overall),
    storyFill: Math.round(storyFill),
    seedFallback: Math.round(100 - seedFallbackScore),
    paymentFailure: Math.round(
      totalPayments > 0 ? (kpi.paymentFail / totalPayments) * 100 : 0
    ),
    offlineRate: Math.round(kpi.offlineRate),
    apiStability: Math.round(apiStabilityScore),
  };
}

/**
 * 건강도 등급
 */
export type HealthGrade = "excellent" | "good" | "warning" | "critical";

export function getHealthGrade(score: number): HealthGrade {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "warning";
  return "critical";
}
