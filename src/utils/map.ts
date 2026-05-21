/**
 * 🔥 지도 관련 유틸리티 함수
 */

/** Static Map / Geocoding 등과 동일하게 쓰는 Google API 키 (프로젝트별 env 이름 혼용 대응) */
function readGoogleMapsBrowserKey(): string {
  const e = import.meta.env as Record<string, string | undefined>;
  return (
    e.VITE_GOOGLE_MAPS_API_KEY ||
    e.VITE_GOOGLE_MAP_KEY ||
    e.VITE_GOOGLE_MAP_API_KEY ||
    e.VITE_MAPS_API_KEY ||
    e.VITE_MAP_API_KEY ||
    e.VITE_APP_GOOGLE_MAP_KEY ||
    ""
  );
}

/**
 * Google Static Map API URL 생성
 * @returns 키가 없으면 `null` (빈 `img` src 로 전체 페이지 재요청되는 것을 방지)
 */
export function getStaticMapUrl(lat: number, lng: number): string | null {
  const key = readGoogleMapsBrowserKey();

  if (!key) {
    console.warn(
      "⚠️ [getStaticMapUrl] Google Maps 브라우저용 키가 없습니다. " +
        "`.env`에 `VITE_GOOGLE_MAPS_API_KEY` 또는 `VITE_GOOGLE_MAP_KEY` 등을 설정하세요."
    );
    return null;
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red%7C${lat},${lng}&key=${key}`;
}

/**
 * Google Maps 길찾기 URL 생성
 * @param lat 위도
 * @param lng 경도
 * @returns Google Maps URL
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
