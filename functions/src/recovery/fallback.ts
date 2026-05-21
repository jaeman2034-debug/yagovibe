/**
 * 🛡️ Fallback Strategies
 * 실패 복구 전략
 */

import * as logger from "firebase-functions/logger";

/**
 * Deterministic Fallback: 평점 기준 후보 선택
 */
export function selectBestPlaceByRating(candidates: any[]): number {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return 0;

  // 평점 높은 순으로 정렬
  const sorted = [...candidates].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const fallbackIndex = candidates.indexOf(sorted[0]);

  logger.info("🛡️ Deterministic Fallback: 평점 기준 선택", fallbackIndex);

  return fallbackIndex >= 0 ? fallbackIndex : 0;
}

/**
 * Ultimate Fallback 응답
 */
export function createUltimateFallbackResponse(query: string) {
  return {
    action: "OPEN_SEARCH" as const,
    query,
    filters: {
      openNow: false,
      parking: false,
      sort: "DEFAULT" as const,
    },
  };
}
