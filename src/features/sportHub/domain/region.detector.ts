/**
 * 🔥 Region Detector - 위치 기반 지역 감지
 * 
 * GPS → Region 매핑
 */

import type { Region } from "./region.types";
import { getDefaultRegion, isValidRegion } from "./region.types";

/**
 * GPS 좌표
 */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * 지역별 중심 좌표 (대략)
 */
const REGION_CENTERS: Record<Region, Coordinates> = {
  seoul: { latitude: 37.5665, longitude: 126.978 },
  busan: { latitude: 35.1796, longitude: 129.0756 },
  daegu: { latitude: 35.8714, longitude: 128.6014 },
  incheon: { latitude: 37.4563, longitude: 126.7052 },
  gwangju: { latitude: 35.1595, longitude: 126.8526 },
  daejeon: { latitude: 36.3504, longitude: 127.3845 },
  ulsan: { latitude: 35.5384, longitude: 129.3114 },
  gyeonggi: { latitude: 37.4138, longitude: 127.5183 },
  gangwon: { latitude: 37.8228, longitude: 128.1555 },
  jeju: { latitude: 33.4996, longitude: 126.5312 },
};

/**
 * 두 좌표 간 거리 계산 (Haversine)
 */
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GPS 좌표로 가장 가까운 지역 추정
 */
export function detectNearestRegion(coords: Coordinates): Region {
  let nearest: Region = getDefaultRegion();
  let minDistance = Infinity;

  for (const [region, center] of Object.entries(REGION_CENTERS)) {
    if (!isValidRegion(region)) continue;
    
    const distance = calculateDistance(coords, center);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = region as Region;
    }
  }

  return nearest;
}

/**
 * 위치 권한 요청 및 지역 감지
 */
export async function requestLocationAndDetectRegion(): Promise<{
  success: boolean;
  region?: Region;
  error?: string;
}> {
  if (!navigator.geolocation) {
    return {
      success: false,
      error: "Geolocation not supported",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const region = detectNearestRegion(coords);
        resolve({
          success: true,
          region,
        });
      },
      (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      },
      {
        timeout: 5000,
        enableHighAccuracy: false,
      }
    );
  });
}

/**
 * IP 기반 지역 추정 (폴백)
 */
export async function detectRegionByIP(): Promise<Region> {
  try {
    // 실제 구현: IP 기반 지역 추정 API 호출
    // const res = await fetch("/api/region/detect");
    // return res.json().region;
    
    // 임시: 기본 지역 반환
    return getDefaultRegion();
  } catch {
    return getDefaultRegion();
  }
}
