/**
 * 🔥 동네 핫딜 점수 계산
 * DAU 폭발 장치 #1
 */

import type { MarketProduct } from "@/types/market";

/**
 * 핫딜 점수 계산
 * 
 * 공식:
 * hotScore = (viewCount * 1) + (favoriteCount * 3) + recencyWeight
 */
export function calculateHotDealScore(product: MarketProduct): number {
  const viewCount = product.viewCount || 0;
  const favoriteCount = (product as any).favoriteCount || 0;
  
  // 최신성 가중치
  let recencyWeight = 0;
  if (product.createdAt) {
    const createdAt = product.createdAt.toDate 
      ? product.createdAt.toDate() 
      : new Date(product.createdAt);
    
    const hours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hours < 6) {
      recencyWeight = 30; // 6시간 이내: 최고점
    } else if (hours < 24) {
      recencyWeight = 15; // 24시간 이내: 높은 점수
    } else {
      recencyWeight = 5; // 그 외: 기본 점수
    }
  }
  
  const hotScore = (viewCount * 1) + (favoriteCount * 3) + recencyWeight;
  
  return hotScore;
}

/**
 * 핫딜 상품 정렬 (점수 내림차순)
 */
export function sortByHotDealScore(products: MarketProduct[]): MarketProduct[] {
  return products
    .map((product) => ({
      ...product,
      _hotScore: calculateHotDealScore(product),
    }))
    .sort((a, b) => (b._hotScore || 0) - (a._hotScore || 0));
}

