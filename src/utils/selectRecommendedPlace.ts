/**
 * 🔥 Phase 25: 추천 장소 선택 유틸리티
 * 
 * 여러 결과 중 하나를 추천하는 단순하고 명확한 로직
 * 기준: 1. 거리 2. 평점 3. 첫 번째
 */
import type { MapPlace } from '@/types/map';

type PlaceWithDistance = MapPlace & {
  distance?: number;
  rating?: number;
};

export function selectRecommendedPlace(places: PlaceWithDistance[]): PlaceWithDistance | null {
  if (!places.length) return null;

  // 🔥 Phase 25: 단순 정렬 - 거리 우선, 평점 가중, 동률이면 첫 번째
  return [...places].sort((a, b) => {
    // 1. 거리 비교 (가까운 것 우선)
    if (a.distance !== undefined && b.distance !== undefined) {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
    }
    
    // 2. 평점 비교 (높은 것 우선)
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    
    // 3. 동률이면 첫 번째 유지
    return 0;
  })[0];
}
