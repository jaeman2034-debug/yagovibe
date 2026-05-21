/**
 * 🎯 Places Scoring
 * 결정적 스코어링 (LLM 없이)
 * 가중치 고정 → 결과 예측 가능
 */

import type { Place } from './types';

export interface ScoringWeights {
  rating: number;
  openNow: number;
  distance: number;
}

/**
 * 기본 가중치
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  rating: 0.6, // 평점 중요도
  openNow: 0.3, // 영업중 중요도
  distance: 0.1, // 거리 중요도 (distanceMeters가 있으면 반영)
};

/**
 * 장소 스코어 계산
 */
export function scorePlace(p: Place, weights = DEFAULT_WEIGHTS): number {
  // 평점 스코어 (0..1)
  const ratingScore = Math.min(p.rating / 5, 1);

  // 영업중 스코어
  const openScore =
    p.openNow === true ? 1 : p.openNow === false ? 0 : 0.5;

  // 거리 스코어 (가까울수록 높음)
  const distanceScore =
    typeof p.distanceMeters === 'number'
      ? 1 / (1 + p.distanceMeters / 1000) // 1km 단위로 정규화
      : 0.5; // 거리 정보 없으면 중간값

  return (
    ratingScore * weights.rating +
    openScore * weights.openNow +
    distanceScore * weights.distance
  );
}

/**
 * 최적 장소 선택 (스코어 높은 순)
 */
export function pickBest(places: Place[]): Place | null {
  if (places.length === 0) return null;
  if (places.length === 1) return places[0];

  let best = places[0];
  let bestScore = scorePlace(best);

  for (let i = 1; i < places.length; i++) {
    const score = scorePlace(places[i]);
    if (score > bestScore) {
      best = places[i];
      bestScore = score;
    }
  }

  return best;
}
