/**
 * 🔥 Phase 29.5: 위치 획득 유틸리티 (모바일 전용 GPS)
 * 
 * 모바일: 정확한 GPS 사용
 * 데스크탑: 대략적인 위치만 사용 (GPS 요청 스킵)
 */

export type LatLng = { lat: number; lng: number };

/**
 * 모바일 디바이스 판별 (가장 안전한 실무 버전)
 */
export function isMobileLikeDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";
  const coarseUA = /Android|iPhone|iPad|iPod/i.test(ua);
  const touch = navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  const small = window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
  
  return coarseUA || (touch && small);
}

/**
 * 모바일에서만 GPS로 정확한 위치 획득, 데스크탑은 fallback 사용
 */
export async function getBestLocationMobileOnly(
  fallback: LatLng,
  onDebug?: (msg: string, data?: any) => void
): Promise<LatLng> {
  // 데스크탑: 바로 fallback
  if (!isMobileLikeDevice()) {
    onDebug?.("📍 데스크탑: GPS 요청 스킵, fallback 사용", fallback);
    return fallback;
  }

  if (!("geolocation" in navigator)) {
    onDebug?.("📍 모바일: geolocation 미지원, fallback 사용", fallback);
    return fallback;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onDebug?.("📍 모바일: GPS 위치 획득 성공", { 
          loc, 
          accuracy: pos.coords.accuracy,
          accuracyMeters: `${Math.round(pos.coords.accuracy)}m`
        });
        resolve(loc);
      },
      (err) => {
        onDebug?.("📍 모바일: GPS 실패 → fallback", { 
          code: err.code, 
          message: err.message 
        });
        resolve(fallback);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 15_000,
      }
    );
  });
}
