// 좌표 타입 정의
export interface LatLng {
  lat: number;
  lng: number;
}

// 타입 별칭
export type LatLngType = LatLng;

// 지구 반지름 (km)
const EARTH_RADIUS_KM = 6371;

// 거리 계산 캐시 (key: "userLat,userLng,prodLat,prodLng")
const distanceCache = new Map<string, string>();

// 두 좌표 사이 거리 계산 (정확한 Haversine 공식)
export function getDistanceKm(a: LatLng, b: LatLng): number {
  const lat1 = a.lat;
  const lon1 = a.lng;
  const lat2 = b.lat;
  const lon2 = b.lng;

  const R = EARTH_RADIUS_KM; // km 단위

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a_value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a_value), Math.sqrt(1 - a_value));

  const distance = R * c;

  return distance; // km
}

// 거리 표시 포맷 (사용자 친화적)
export function formatDistanceKm(distanceKm?: number | null): string {
  if (distanceKm == null || Number.isNaN(distanceKm) || distanceKm === Infinity) {
    return "위치 정보 없음";
  }
  
  // 0~1km → m 단위
  if (distanceKm < 1) {
    return `약 ${Math.round(distanceKm * 1000)}m`;
  }
  
  // 1~20km → 1 decimal
  if (distanceKm < 20) {
    return `약 ${distanceKm.toFixed(1)}km`;
  }
  
  // 20km 이상 → 정수 + "+"
  return `${Math.round(distanceKm)}km+`;
}

// 별칭 함수 (호환성 유지)
export function formatDistance(km: number | null | undefined): string {
  return formatDistanceKm(km);
}

// 캐시된 거리 계산 (성능 최적화)
export function getCachedDistance(user: LatLng, prod: LatLng): string {
  const key = `${user.lat},${user.lng},${prod.lat},${prod.lng}`;
  
  if (distanceCache.has(key)) {
    return distanceCache.get(key)!;
  }
  
  const km = getDistanceKm(user, prod);
  const formatted = formatDistanceKm(km);
  
  distanceCache.set(key, formatted);
  return formatted;
}

// 캐시 초기화 (필요시 사용)
export function clearDistanceCache(): void {
  distanceCache.clear();
}

// 현재 위치 가져오기
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported"));
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}
