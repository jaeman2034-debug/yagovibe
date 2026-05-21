/**
 * 🔥 Phase 30: 경로 이탈 감지 유틸리티
 * 
 * 현재 위치가 경로에서 얼마나 벗어났는지 계산
 */

import { getDistanceKm, type LatLng } from './distance';

/**
 * 경로에서 현재 위치까지의 최단 거리 계산 (km)
 * 
 * @param currentLocation 현재 위치
 * @param routePath 경로 좌표 배열
 * @returns 최단 거리 (km), 경로가 비어있으면 Infinity
 */
export function getDistanceToRoute(
  currentLocation: LatLng,
  routePath: LatLng[]
): number {
  if (routePath.length === 0) {
    return Infinity;
  }

  if (routePath.length === 1) {
    return getDistanceKm(currentLocation, routePath[0]);
  }

  // 🔥 Phase 30: 경로의 각 선분에서 최단 거리 계산
  let minDistance = Infinity;

  for (let i = 0; i < routePath.length - 1; i++) {
    const segmentStart = routePath[i];
    const segmentEnd = routePath[i + 1];
    
    const distance = getDistanceToSegment(
      currentLocation,
      segmentStart,
      segmentEnd
    );

    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * 점에서 선분까지의 최단 거리 계산 (km)
 * 
 * @param point 점 (현재 위치)
 * @param segmentStart 선분 시작점
 * @param segmentEnd 선분 끝점
 * @returns 최단 거리 (km)
 */
function getDistanceToSegment(
  point: LatLng,
  segmentStart: LatLng,
  segmentEnd: LatLng
): number {
  // 🔥 Phase 30: 선분의 길이 계산
  const segmentLength = getDistanceKm(segmentStart, segmentEnd);
  
  if (segmentLength === 0) {
    return getDistanceKm(point, segmentStart);
  }

  // 🔥 Phase 30: 점에서 선분의 양 끝점까지의 거리
  const distToStart = getDistanceKm(point, segmentStart);
  const distToEnd = getDistanceKm(point, segmentEnd);

  // 🔥 Phase 30: 선분이 매우 짧으면 양 끝점 중 가까운 거리 반환
  if (segmentLength < 0.01) { // 10m 미만
    return Math.min(distToStart, distToEnd);
  }

  // 🔥 Phase 30: 선분 위의 가장 가까운 점 계산 (단순화된 버전)
  // 실제로는 구면 좌표계에서의 정확한 계산이 필요하지만,
  // 짧은 거리에서는 유클리드 거리 근사치로 충분
  const lat1 = segmentStart.lat;
  const lng1 = segmentStart.lng;
  const lat2 = segmentEnd.lat;
  const lng2 = segmentEnd.lng;
  const lat0 = point.lat;
  const lng0 = point.lng;

  // 🔥 Phase 30: 선분의 방향 벡터
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  // 🔥 Phase 30: 점에서 선분 시작점까지의 벡터
  const pLat = lat0 - lat1;
  const pLng = lng0 - lng1;

  // 🔥 Phase 30: 투영 계수 계산 (0~1 사이)
  const t = Math.max(0, Math.min(1, (pLat * dLat + pLng * dLng) / (dLat * dLat + dLng * dLng)));

  // 🔥 Phase 30: 선분 위의 가장 가까운 점
  const closestLat = lat1 + t * dLat;
  const closestLng = lng1 + t * dLng;

  // 🔥 Phase 30: 최단 거리 반환
  return getDistanceKm(point, { lat: closestLat, lng: closestLng });
}

/**
 * 경로 이탈 여부 판단
 * 
 * @param currentLocation 현재 위치
 * @param routePath 경로 좌표 배열
 * @param threshold 이탈 기준 거리 (km, 기본값: 0.05 = 50m)
 * @returns 이탈 여부
 */
export function isRouteDeviation(
  currentLocation: LatLng,
  routePath: LatLng[],
  threshold: number = 0.05 // 50m
): boolean {
  const distance = getDistanceToRoute(currentLocation, routePath);
  return distance > threshold;
}
