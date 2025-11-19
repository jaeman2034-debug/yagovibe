import type { MarketProduct } from "@/types/market";

// 최신 점수 (최근일수 기반)
export function getRecencyScore(createdAt: any): number {
  if (!createdAt) return 0;

  let createdTime: number;
  
  if (typeof createdAt === "string") {
    createdTime = new Date(createdAt).getTime();
  } else if (createdAt?.toDate && typeof createdAt.toDate === "function") {
    createdTime = createdAt.toDate().getTime();
  } else if (createdAt instanceof Date) {
    createdTime = createdAt.getTime();
  } else if (typeof createdAt === "number") {
    createdTime = createdAt;
  } else {
    return 0;
  }

  const now = Date.now();
  const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24);

  // 0일 = 1.0점, 30일 이상 = 0점으로 떨어지는 함수
  const score = Math.max(0, 1 - diffDays / 30);
  return score; // 0 ~ 1
}

// 거리 점수 (가까울수록 1, 멀수록 0)
export function getDistanceScore(km: number | null): number {
  if (km == null) return 0; // 위치 없는 상품은 0점

  if (km <= 1) return 1; // 1km 이내 = 최고점

  if (km >= 20) return 0; // 20km 이상 = 0점

  // 1km~20km 사이 선형 감쇠
  return 1 - (km - 1) / 19; // 1에서 0 사이
}

// 품질 점수 (사진/설명/조회수 기반)
export function getQualityScore(p: MarketProduct): number {
  let score = 0;

  if (p.photoCount && p.photoCount > 0) score += 0.4;
  if (p.photoCount && p.photoCount >= 3) score += 0.2;
  if (p.hasDescription) score += 0.2;
  if (p.viewCount && p.viewCount > 20) score += 0.2;

  return Math.min(score, 1); // 0 ~ 1
}

// 스마트 추천 점수 만들기
export function getSmartScore(
  product: MarketProduct,
  distanceKm: number | null
): number {
  const recency = getRecencyScore(product.createdAt); // 0~1
  const distance = getDistanceScore(distanceKm); // 0~1
  const quality = getQualityScore(product); // 0~1

  // 가중치 (원하면 나중에 튜닝)
  const WEIGHT_RECENCY = 0.4;
  const WEIGHT_DISTANCE = 0.35;
  const WEIGHT_QUALITY = 0.25;

  return (
    recency * WEIGHT_RECENCY +
    distance * WEIGHT_DISTANCE +
    quality * WEIGHT_QUALITY
  );
}

