/**
 * 📈 카테고리 급상승 점수 계산
 * DAU 폭발 장치 #3
 */

import type { MarketProduct } from "@/types/market";

/**
 * 카테고리별 트렌드 점수 계산
 * 
 * 공식:
 * categoryTrendScore = (최근 24시간 등록 수 * 2) + (조회 증가율)
 */
export interface CategoryTrend {
  category: string;
  score: number;
  recentCount: number; // 최근 24시간 등록 수
  viewGrowth: number; // 조회 증가율 (%)
}

/**
 * 카테고리별 트렌드 계산
 * 
 * @param products - 전체 상품 목록
 * @returns 카테고리별 트렌드 점수 (내림차순)
 */
export function calculateCategoryTrends(
  products: MarketProduct[]
): CategoryTrend[] {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  
  // 카테고리별 통계
  const categoryStats = new Map<string, {
    total: number;
    recent: number; // 24시간 이내 등록
    totalViews: number;
    recentViews: number; // 24시간 이내 조회
  }>();
  
  for (const product of products) {
    const category = product.category || "미분류";
    
    if (!categoryStats.has(category)) {
      categoryStats.set(category, {
        total: 0,
        recent: 0,
        totalViews: 0,
        recentViews: 0,
      });
    }
    
    const stats = categoryStats.get(category)!;
    stats.total += 1;
    stats.totalViews += product.viewCount || 0;
    
    // 최근 24시간 이내 등록
    if (product.createdAt) {
      const createdAt = product.createdAt.toDate 
        ? product.createdAt.toDate().getTime()
        : new Date(product.createdAt).getTime();
      
      if (createdAt >= twentyFourHoursAgo) {
        stats.recent += 1;
        stats.recentViews += product.viewCount || 0;
      }
    }
  }
  
  // 트렌드 점수 계산
  const trends: CategoryTrend[] = [];
  
  for (const [category, stats] of categoryStats.entries()) {
    const recentCount = stats.recent;
    
    // 조회 증가율 계산
    const oldViews = stats.totalViews - stats.recentViews;
    const viewGrowth = oldViews > 0 
      ? ((stats.recentViews - oldViews) / oldViews) * 100 
      : stats.recentViews > 0 ? 100 : 0;
    
    // 트렌드 점수 = (최근 24시간 등록 수 * 2) + (조회 증가율)
    const score = (recentCount * 2) + viewGrowth;
    
    trends.push({
      category,
      score,
      recentCount,
      viewGrowth: Math.round(viewGrowth * 10) / 10, // 소수점 1자리
    });
  }
  
  // 점수 내림차순 정렬
  return trends.sort((a, b) => b.score - a.score);
}

