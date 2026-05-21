/**
 * 🔥 Marketing AB - AB 테스트 연동
 * 
 * AB와 완전 연동, CTR 비교 후 자동 승자
 */

import type { Campaign } from "./marketing.types";
import { getAssignment } from "../domain/experiment.assign";
import { logExperiment } from "../domain/experiment.log";

/**
 * AB 변형 선택
 */
export function selectABVariant(
  campaign: Campaign,
  userId: string
): {
  variant: "A" | "B";
  message: string;
} {
  // 기존 AB 테스트 프레임워크 활용
  const assignment = getAssignment(userId, campaign.abKey);
  const variant = assignment.variant === "A" ? "A" : "B";
  const message = variant === "A" ? campaign.messageA : campaign.messageB;
  
  return { variant, message };
}

/**
 * AB 테스트 로그 기록
 */
export function logCampaignAB(
  campaign: Campaign,
  userId: string,
  variant: "A" | "B",
  event: "impression" | "click" | "conversion"
): void {
  logExperiment({
    userId,
    experimentKey: campaign.abKey,
    variant: variant === "A" ? "A" : "B",
    event,
    metadata: {
      campaignId: campaign.id,
      trigger: campaign.trigger,
      channel: campaign.channels[0], // 첫 번째 채널
    },
  });
}

/**
 * AB 테스트 승자 결정 (서버 측)
 */
export function determineCampaignWinner(
  campaignId: string,
  stats: {
    variantA: { impressions: number; clicks: number; conversions: number };
    variantB: { impressions: number; clicks: number; conversions: number };
  }
): "A" | "B" | "tie" {
  const ctrA = stats.variantA.impressions > 0
    ? stats.variantA.clicks / stats.variantA.impressions
    : 0;
  const ctrB = stats.variantB.impressions > 0
    ? stats.variantB.clicks / stats.variantB.impressions
    : 0;
  
  // 통계적 유의성 검정 (간단 버전)
  const minSamples = 100; // 최소 샘플 수
  const significanceThreshold = 0.05; // 5% 유의수준
  
  if (
    stats.variantA.impressions < minSamples ||
    stats.variantB.impressions < minSamples
  ) {
    return "tie"; // 샘플 부족
  }
  
  const diff = Math.abs(ctrA - ctrB);
  const pooledCTR = (stats.variantA.clicks + stats.variantB.clicks) /
    (stats.variantA.impressions + stats.variantB.impressions);
  const se = Math.sqrt(
    pooledCTR * (1 - pooledCTR) *
    (1 / stats.variantA.impressions + 1 / stats.variantB.impressions)
  );
  const zScore = diff / se;
  
  // z-score > 1.96 (95% 신뢰구간)
  if (zScore > 1.96) {
    return ctrA > ctrB ? "A" : "B";
  }
  
  return "tie";
}
