/**
 * 🔥 광고 랭킹 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - organic 0.7 + adBid 0.3 결합
 * - 광고와 일반 게시글 혼합 랭킹
 */

import { logger } from "firebase-functions/v2";
import { AdData } from "./ads";

/**
 * 랭킹 점수 계산
 */
export function calculateAdRankingScore(
  organicScore: number,
  adBid: number
): number {
  // 🔥 organic 0.7 + adBid 0.3
  return organicScore * 0.7 + adBid * 0.3;
}

/**
 * 광고 랭킹 점수 계산 (CPC 기반)
 */
export function calculateAdBidScore(ad: AdData): number {
  // 🔥 CPC를 0~1 범위로 정규화 (최대 CPC 1000원 가정)
  const maxCpc = 1000;
  const normalizedBid = Math.min(1, ad.cpc / maxCpc);

  // 🔥 예산 남은 비율도 고려
  const budgetRatio = 1 - ad.spent / ad.budget;

  // 🔥 종합 점수
  return normalizedBid * 0.7 + budgetRatio * 0.3;
}

/**
 * 혼합 랭킹 (광고 + 일반 게시글)
 */
export interface RankedItem {
  id: string;
  type: "ad" | "market" | "community";
  data: any;
  score: number;
}

export function mergeRankings(
  marketItems: Array<{ id: string; data: any; score: number }>,
  adItems: AdData[]
): RankedItem[] {
  const rankedItems: RankedItem[] = [];

  // 🔥 일반 게시글 추가
  for (const item of marketItems) {
    rankedItems.push({
      id: item.id,
      type: "market",
      data: item.data,
      score: item.score, // 이미 정규화된 점수
    });
  }

  // 🔥 광고 추가
  for (const ad of adItems) {
    const adBidScore = calculateAdBidScore(ad);
    const organicScore = 0.5; // 광고는 기본 organic 점수
    const rankingScore = calculateAdRankingScore(organicScore, adBidScore);

    rankedItems.push({
      id: ad.id,
      type: "ad",
      data: ad,
      score: rankingScore,
    });
  }

  // 🔥 점수 순으로 정렬
  rankedItems.sort((a, b) => b.score - a.score);

  logger.info("[mergeRankings] 혼합 랭킹 완료:", {
    marketCount: marketItems.length,
    adCount: adItems.length,
    totalCount: rankedItems.length,
  });

  return rankedItems;
}
