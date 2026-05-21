/**
 * ✅ 오늘의 거래 완료 상품 조회
 * DAU 폭발 장치 #2
 */

import type { MarketProduct } from "@/types/market";

/**
 * 오늘 거래 완료된 상품 필터링
 * 
 * @param products - 전체 상품 목록
 * @returns 오늘 거래 완료된 상품 목록
 */
export function getTodayDeals(products: MarketProduct[]): MarketProduct[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  return products.filter((product) => {
    // status가 "sold"이고 soldAt이 오늘인 경우
    const status = (product as any).status;
    const soldAt = (product as any).soldAt;
    
    if (status !== "sold" || !soldAt) {
      return false;
    }
    
    const soldDate = soldAt.toDate 
      ? soldAt.toDate().getTime()
      : new Date(soldAt).getTime();
    
    return soldDate >= todayStart;
  });
}

/**
 * 거래 완료 상품 정렬 (최근 거래 순)
 */
export function sortTodayDeals(products: MarketProduct[]): MarketProduct[] {
  return products.sort((a, b) => {
    const soldAtA = (a as any).soldAt;
    const soldAtB = (b as any).soldAt;
    
    if (!soldAtA) return 1;
    if (!soldAtB) return -1;
    
    const timeA = soldAtA.toDate 
      ? soldAtA.toDate().getTime()
      : new Date(soldAtA).getTime();
    
    const timeB = soldAtB.toDate 
      ? soldAtB.toDate().getTime()
      : new Date(soldAtB).getTime();
    
    return timeB - timeA; // 최신순
  });
}

