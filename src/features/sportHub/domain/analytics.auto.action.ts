/**
 * 🔥 Analytics Auto Action - 자동 액션 규칙
 * 
 * 데이터 기반 자동 튜닝
 */

import type { DailyKpi } from "./analytics.types";
import type { StorySource } from "./story.types";

/**
 * 혼합 D 가중치 조정
 */
export type MixDWeightAdjustment = {
  source: StorySource;
  adjustment: number; // -10 ~ +10 (%)
  reason: string;
};

/**
 * 혼합 D 자동 가중치 계산
 */
export function calculateMixDWeightAdjustment(
  sourceCTRs: Map<StorySource, number>
): MixDWeightAdjustment[] {
  const adjustments: MixDWeightAdjustment[] = [];
  const baselineCTR = 2.5; // 기준 CTR (%)

  for (const [source, ctr] of sourceCTRs) {
    if (ctr < 1.5) {
      // CTR이 1.5% 미만이면 비율 -10%
      adjustments.push({
        source,
        adjustment: -10,
        reason: `CTR ${ctr.toFixed(2)}% < 1.5% 기준`,
      });
    } else if (ctr > 4.0) {
      // CTR이 4% 초과면 비율 +10%
      adjustments.push({
        source,
        adjustment: 10,
        reason: `CTR ${ctr.toFixed(2)}% > 4% 기준`,
      });
    }
  }

  return adjustments;
}

/**
 * AB 자동 종료 조건
 */
export type ABAutoEndCondition = {
  experimentKey: string;
  shouldEnd: boolean;
  winner?: "A" | "B";
  reason: string;
};

/**
 * AB 자동 종료 조건 확인
 */
export function checkABAutoEndCondition(
  experimentKey: string,
  stats: {
    variantA: { impressions: number; clicks: number };
    variantB: { impressions: number; clicks: number };
    startDate: string;
    minSamples: number;
    minDays: number;
    minUplift: number; // 10% = 0.1
  }
): ABAutoEndCondition {
  const totalSamples = stats.variantA.impressions + stats.variantB.impressions;
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(stats.startDate).getTime()) / (24 * 60 * 60 * 1000)
  );

  // 조건 1: 표본 수
  const hasEnoughSamples = totalSamples >= stats.minSamples;

  // 조건 2: 기간
  const hasEnoughDays = daysSinceStart >= stats.minDays;

  // 조건 3: CTR 계산
  const ctrA =
    stats.variantA.impressions > 0
      ? stats.variantA.clicks / stats.variantA.impressions
      : 0;
  const ctrB =
    stats.variantB.impressions > 0
      ? stats.variantB.clicks / stats.variantB.impressions
      : 0;

  const uplift = Math.abs(ctrA - ctrB) / Math.min(ctrA || 0.01, ctrB || 0.01);
  const hasEnoughUplift = uplift >= stats.minUplift;

  // 승자 결정
  const winner = ctrA > ctrB ? "A" : ctrB > ctrA ? "B" : undefined;

  if (hasEnoughSamples && hasEnoughDays && hasEnoughUplift && winner) {
    return {
      experimentKey,
      shouldEnd: true,
      winner,
      reason: `표본 ${totalSamples}개, ${daysSinceStart}일, uplift ${(uplift * 100).toFixed(1)}%`,
    };
  }

  return {
    experimentKey,
    shouldEnd: false,
    reason: `조건 미충족: 표본 ${totalSamples}/${stats.minSamples}, 기간 ${daysSinceStart}/${stats.minDays}, uplift ${(uplift * 100).toFixed(1)}%/${stats.minUplift * 100}%`,
  };
}

/**
 * 마케팅 자동 튜닝 규칙
 */
export type MarketingTuningRule = {
  campaignId: string;
  action: "pause" | "reduce_frequency" | "boost_priority";
  reason: string;
};

/**
 * 마케팅 자동 튜닝 계산
 */
export function calculateMarketingTuning(
  kpi: DailyKpi,
  campaignStats: Array<{
    campaignId: string;
    ctr: number;
    payFailRate: number;
  }>
): MarketingTuningRule[] {
  const rules: MarketingTuningRule[] = [];

  // 결제 실패율 > 8% → 할인 메시지 중단
  if (kpi.booking.fail > 0) {
    const payFailRate = (kpi.booking.fail / kpi.booking.start) * 100;
    if (payFailRate > 8) {
      for (const stat of campaignStats) {
        if (stat.payFailRate > 8) {
          rules.push({
            campaignId: stat.campaignId,
            action: "pause",
            reason: `결제 실패율 ${payFailRate.toFixed(1)}% > 8%`,
          });
        }
      }
    }
  }

  // CTR < 1% → 발송 빈도 -30%
  for (const stat of campaignStats) {
    if (stat.ctr < 1.0) {
      rules.push({
        campaignId: stat.campaignId,
        action: "reduce_frequency",
        reason: `CTR ${stat.ctr.toFixed(2)}% < 1%`,
      });
    }
  }

  return rules;
}

/**
 * 자동 액션 실행 (통합)
 */
export type AutoActionResult = {
  mixDAdjustments: MixDWeightAdjustment[];
  abAutoEnds: ABAutoEndCondition[];
  marketingTunings: MarketingTuningRule[];
};

export function calculateAutoActions(
  kpi: DailyKpi,
  sourceCTRs: Map<StorySource, number>,
  abExperiments: Array<{
    experimentKey: string;
    variantA: { impressions: number; clicks: number };
    variantB: { impressions: number; clicks: number };
    startDate: string;
  }>,
  campaignStats: Array<{
    campaignId: string;
    ctr: number;
    payFailRate: number;
  }>
): AutoActionResult {
  return {
    mixDAdjustments: calculateMixDWeightAdjustment(sourceCTRs),
    abAutoEnds: abExperiments.map((exp) =>
      checkABAutoEndCondition(exp.experimentKey, {
        ...exp,
        minSamples: 3000,
        minDays: 7,
        minUplift: 0.1, // 10%
      })
    ),
    marketingTunings: calculateMarketingTuning(kpi, campaignStats),
  };
}
