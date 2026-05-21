/**
 * 검색 의도 보정 & 결과 랭킹
 * 체육인 감성 완성판
 */

import { getDistanceKm } from "./geo";
import type { LatLng } from "./geo";
import type { MarketProduct } from "@/types/market";

// 의도 키워드 매핑
const INTENT_KEYWORDS = {
  goodCondition: ["상태", "좋은", "깨끗", "새거", "새것", "미사용", "새상품"],
  directDeal: ["직거래", "직접", "만나서"],
  cheap: ["급처", "싸게", "저렴", "싼", "할인"],
};

/**
 * 키워드 토큰에서 검색 의도 추출
 */
export function extractIntent(tokens: string[]): {
  goodCondition: boolean;
  directDeal: boolean;
  cheap: boolean;
} {
  const lowerTokens = tokens.map((t) => t.toLowerCase());
  
  return {
    goodCondition: INTENT_KEYWORDS.goodCondition.some((kw) =>
      lowerTokens.some((t) => t.includes(kw.toLowerCase()))
    ),
    directDeal: INTENT_KEYWORDS.directDeal.some((kw) =>
      lowerTokens.some((t) => t.includes(kw.toLowerCase()))
    ),
    cheap: INTENT_KEYWORDS.cheap.some((kw) =>
      lowerTokens.some((t) => t.includes(kw.toLowerCase()))
    ),
  };
}

/**
 * 거리 점수 (가까울수록 높음)
 */
function distanceScore(distanceKm: number | null): number {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return 0;
  }
  
  if (distanceKm < 1) return 40; // 1km 이내: 최고점
  if (distanceKm < 3) return 30; // 3km 이내: 높은 점수
  if (distanceKm < 5) return 20; // 5km 이내: 중간
  return 5; // 그 외: 낮은 점수
}

/**
 * 최신 점수 (최근 등록일수록 높음)
 */
function recencyScore(createdAt: Date | null): number {
  if (!createdAt) return 0;
  
  const hours = (Date.now() - createdAt.getTime()) / 3600000;
  
  if (hours < 6) return 30; // 6시간 이내: 최고점
  if (hours < 24) return 20; // 24시간 이내: 높은 점수
  if (hours < 72) return 10; // 3일 이내: 중간
  return 0; // 그 외: 점수 없음
}

/**
 * 상태 점수 (텍스트 기반)
 */
function conditionScore(name: string, description?: string | null): number {
  const text = `${name} ${description || ""}`.toLowerCase();
  
  if (text.includes("미사용") || text.includes("새상품") || text.includes("새거") || text.includes("새것")) {
    return 20;
  }
  if (text.includes("상태 좋") || text.includes("깨끗") || text.includes("거의 새")) {
    return 15;
  }
  if (text.includes("상태 보통") || text.includes("사용감")) {
    return 10;
  }
  return 5; // 기본 점수
}

/**
 * 가격 점수 (저렴할수록 높음, 선택적)
 */
function priceScore(price: number | null | undefined): number {
  if (!price || price <= 0) return 0;
  
  if (price < 30000) return 15; // 3만원 미만: 높은 점수
  if (price < 50000) return 10; // 5만원 미만: 중간
  if (price < 100000) return 5; // 10만원 미만: 낮은 점수
  return 0; // 그 외: 점수 없음
}

/**
 * 상품 점수 계산 (의도 기반 가중치 적용)
 * 💰 수익화: 프리미엄 부스트 가중치 포함
 */
export function computeProductScore(
  product: MarketProduct,
  intent: ReturnType<typeof extractIntent>,
  userLocation: LatLng | null
): number {
  let score = 0;
  
  // 💰 프리미엄 부스트 가중치 (1~2개만 위로, 자연스러운 과금)
  if (product.isBoosted) {
    score += 15; // 핫딜 부스트 점수
  }
  
  // 1. 거리 점수
  let distanceKm: number | null = null;
  if (userLocation && product.latitude && product.longitude) {
    distanceKm = getDistanceKm(userLocation, {
      lat: product.latitude,
      lng: product.longitude,
    });
    score += distanceScore(distanceKm);
  }
  
  // 2. 최신 점수
  if (product.createdAt) {
    const createdAt = product.createdAt.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
    score += recencyScore(createdAt);
  }
  
  // 3. 상태 점수
  score += conditionScore(product.name || "", product.description);
  
  // 4. 가격 점수
  score += priceScore(product.price);
  
  // 🔥 의도 기반 가중치 적용
  if (intent.directDeal) {
    // 직거래 의도: 가까운 거리 강조
    if (distanceKm !== null) {
      if (distanceKm < 3) {
        score += 20; // 3km 이내: 큰 가산
      } else if (distanceKm < 5) {
        score += 10; // 5km 이내: 중간 가산
      } else {
        score -= 10; // 5km 초과: 감점
      }
    }
  }
  
  if (intent.goodCondition) {
    // 상태 좋은 의도: 상태 점수 추가 가중
    const condition = conditionScore(product.name || "", product.description);
    score += condition * 0.5; // 상태 점수의 50% 추가
  }
  
  if (intent.cheap) {
    // 급처/싸게 의도: 저렴한 가격 강조
    if (product.price && product.price < 30000) {
      score += 20; // 3만원 미만: 큰 가산
    } else if (product.price && product.price < 50000) {
      score += 10; // 5만원 미만: 중간 가산
    }
  }
  
  return score;
}

/**
 * 검색 결과 랭킹 적용
 */
export function rankSearchResults(
  products: MarketProduct[],
  intent: ReturnType<typeof extractIntent>,
  userLocation: LatLng | null
): MarketProduct[] {
  return products
    .map((product) => ({
      ...product,
      _searchScore: computeProductScore(product, intent, userLocation),
    }))
    .sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
}

