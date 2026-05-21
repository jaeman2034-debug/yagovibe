/**
 * 🔥 Map Integration - 지도 연동 유틸리티
 * 
 * 구장 탐색 → 예약 전환
 */

import type { GroundMapView } from "../domain/superapp.types";

/**
 * 지도 제공자
 */
export type MapProvider = "kakao" | "naver" | "google";

/**
 * 카카오맵 길찾기 열기
 */
export function openKakaoDirection(ground: GroundMapView): void {
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(ground.name)},${ground.lat},${ground.lng}`;
  window.open(url, "_blank");
}

/**
 * 네이버맵 길찾기 열기
 */
export function openNaverDirection(ground: GroundMapView): void {
  const url = `https://map.naver.com/v5/directions/-/${ground.lat},${ground.lng},${encodeURIComponent(ground.name)}`;
  window.open(url, "_blank");
}

/**
 * 구글맵 길찾기 열기
 */
export function openGoogleDirection(ground: GroundMapView): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${ground.lat},${ground.lng}`;
  window.open(url, "_blank");
}

/**
 * 길찾기 열기 (기본: 카카오)
 */
export function openDirection(
  ground: GroundMapView,
  provider: MapProvider = "kakao"
): void {
  switch (provider) {
    case "kakao":
      openKakaoDirection(ground);
      break;
    case "naver":
      openNaverDirection(ground);
      break;
    case "google":
      openGoogleDirection(ground);
      break;
  }
}

/**
 * 지도보기 (앱 내부)
 */
export function openMapView(
  ground: GroundMapView,
  navigate: (path: string) => void
): void {
  navigate(`/r/${ground.region}/ground/${ground.id}?from=map`);
}

/**
 * 현재 위치 기반 가까운 구장 찾기
 */
export function findNearestGrounds(
  grounds: GroundMapView[],
  userLat: number,
  userLng: number,
  limit: number = 5
): GroundMapView[] {
  // Haversine 거리 계산
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return grounds
    .map((ground) => ({
      ...ground,
      distance: calculateDistance(userLat, userLng, ground.lat, ground.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ distance, ...ground }) => ground);
}
