// src/utils/distance.ts

export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * 두 좌표(위도/경도) 사이의 거리를 km 단위로 리턴 (하버사인 공식)
 */
export function getDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * d;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

