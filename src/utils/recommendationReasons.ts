import type { MarketProduct } from "@/types/market";

export function getRecommendReasons(
  product: MarketProduct,
  km: number | null
): string[] {
  const reasons: string[] = [];

  // 1. 가까운 거리
  if (km != null && km < 5) {
    reasons.push("가까운 거리");
  }

  // 2. 최근 등록
  if (product.createdAt) {
    let createdTime: number;
    
    if (typeof product.createdAt === "string") {
      createdTime = new Date(product.createdAt).getTime();
    } else if (product.createdAt?.toDate && typeof product.createdAt.toDate === "function") {
      createdTime = product.createdAt.toDate().getTime();
    } else if (product.createdAt instanceof Date) {
      createdTime = product.createdAt.getTime();
    } else if (typeof product.createdAt === "number") {
      createdTime = product.createdAt;
    } else {
      createdTime = 0;
    }

    if (createdTime > 0) {
      const diffDays =
        (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) {
        reasons.push("최근 등록됨");
      }
    }
  }

  // 3. 품질 점수
  if (product.photoCount && product.photoCount >= 3) {
    reasons.push("사진 품질 좋음");
  }

  // 4. 인기 상품
  if (product.viewCount && product.viewCount >= 30) {
    reasons.push("인기 많은 상품");
  }

  return reasons.slice(0, 2); // 최대 2개만 표시 (UI 안정)
}

