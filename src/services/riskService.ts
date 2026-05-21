/**
 * 🔥 사기 의심 패턴 탐지 서비스
 *
 * users/market 문서 쓰기는 Cloud Functions 트리거에서 처리 (클라 직접 패치 불가).
 */

import type { MarketPost } from "@/types/market";

/**
 * 게시글 위험 점수 — Cloud Functions `onMarketWriteTrustRisk`에서 처리
 */
export async function updatePostRiskScore(_postId: string, _post: MarketPost): Promise<void> {
  return;
}

/** 사용자 위험 스냅샷 — 서버 트리거에서 처리 */
export async function updateUserRiskScore(_userId: string): Promise<void> {
  return;
}

/** 리뷰 생성 시 리스크 감소 — `onMarketReviewCreatedTrustRisk` */
export async function decreaseUserRiskOnReview(_userId: string, _decreaseAmount: number = 5): Promise<void> {
  return;
}

/** 거래 완료 시 리스크 감소 — `onMarketWriteTrustRisk`(status 전환) */
export async function decreaseUserRiskOnTransactionComplete(
  _userId: string,
  _decreaseAmount: number = 3
): Promise<void> {
  return;
}
