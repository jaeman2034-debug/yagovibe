/**
 * 🔥 거리 계산 결과 검증 유틸
 * 
 * 비정상 거리 값(0, NaN, 과도하게 큰 값)을 자동 감지
 * 개발/운영 중 원인 추적 로그 확보
 */

/**
 * 비정상 거리 판정 기준
 * 
 * @param distanceKm - 거리 (km)
 * @returns 비정상 여부
 */
export function isInvalidDistance(distanceKm: number | null | undefined): boolean {
  if (distanceKm === null || distanceKm === undefined) {
    return true; // null/undefined는 비정상
  }

  if (Number.isNaN(distanceKm)) {
    return true; // NaN은 비정상
  }

  if (distanceKm < 0) {
    return true; // 음수는 비정상
  }

  if (distanceKm < 0.01) {
    return true; // 10m 미만 (동일 좌표 의심)
  }

  // 🔥 지도 marker 필터 완화: 거리 제한 제거 (지도는 그냥 찍기)
  // if (distanceKm > 100) {
  //   return true; // 100km 초과 (좌표 오류 의심)
  // }

  // 🔥 유효성만 체크 (isFinite)
  if (!Number.isFinite(distanceKm)) {
    return true;
  }

  return false;
}

/**
 * 비정상 거리 원인 분석
 * 
 * @param distanceKm - 거리 (km)
 * @returns 원인 코드
 */
export function getDistanceAnomalyReason(
  distanceKm: number | null | undefined
): "NULL" | "NAN" | "NEGATIVE" | "ZERO_DISTANCE" | "OUT_OF_RANGE" | "VALID" {
  if (distanceKm === null || distanceKm === undefined) {
    return "NULL";
  }

  if (Number.isNaN(distanceKm)) {
    return "NAN";
  }

  if (distanceKm < 0) {
    return "NEGATIVE";
  }

  if (distanceKm < 0.01) {
    return "ZERO_DISTANCE"; // 10m 미만
  }

  // 🔥 지도 marker 필터 완화: 거리 제한 제거
  // if (distanceKm > 100) {
  //   return "OUT_OF_RANGE"; // 100km 초과
  // }

  // 🔥 유효성만 체크
  if (!Number.isFinite(distanceKm)) {
    return "NAN";
  }

  return "VALID";
}

/**
 * 비정상 거리 로그 출력 (개발 환경에서만)
 * 
 * @param context - 로그 컨텍스트
 */
export function logDistanceAnomaly(context: {
  productId?: string;
  productLat?: number | null;
  productLng?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  locationText?: string | null;
  distanceKm: number | null | undefined;
  reason?: string;
}) {
  // 🔥 개발 환경에서만 로그 출력
  if (!import.meta.env.DEV) {
    return;
  }

  const reason = context.reason || getDistanceAnomalyReason(context.distanceKm);

  console.warn("⚠️ [DistanceAnomaly] 비정상 거리 감지:", {
    productId: context.productId || "unknown",
    productLat: context.productLat,
    productLng: context.productLng,
    userLat: context.userLat,
    userLng: context.userLng,
    locationText: context.locationText || "없음",
    distanceKm: context.distanceKm,
    reason,
    timestamp: new Date().toISOString(),
  });
}

