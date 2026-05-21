/**
 * 이미지 특징 → 배치 슬롯 점수 (규칙 + 선택적 데이터 기반 bias)
 */

import type { ImageFeatures } from "./imageContentHeuristics";

export type PlacementScoreMap = {
  intro_section: number;
  activity_section: number;
  general_post: number;
  market_post: number;
};

export interface PlacementHeuristicAdjustment {
  introBias: number;
  activityBias: number;
  generalBias: number;
  marketBias: number;
}

export function scoreRecommendedUse(
  features: ImageFeatures,
  adj?: PlacementHeuristicAdjustment
): PlacementScoreMap {
  const scores: PlacementScoreMap = {
    intro_section: 0,
    activity_section: 0,
    general_post: 0,
    market_post: 0,
  };

  if (features.isProduct) scores.market_post += 1.2;
  if (features.isGroup) scores.intro_section += 0.7;
  if (features.hasPeople) scores.intro_section += 0.4;
  if (features.isAction) scores.activity_section += 0.8;
  if (features.isGroup && features.isAction) scores.activity_section += 0.6;

  scores.general_post += 0.2;

  if (adj) {
    scores.intro_section += adj.introBias;
    scores.activity_section += adj.activityBias;
    scores.general_post += adj.generalBias;
    scores.market_post += adj.marketBias;
  }

  return scores;
}

export function pickTopPlacement(scores: PlacementScoreMap): keyof PlacementScoreMap {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as keyof PlacementScoreMap;
}
