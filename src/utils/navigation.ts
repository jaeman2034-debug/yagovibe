/**
 * 🔥 AI 비서 지도: Google Maps 네비게이션 연동
 * 
 * 역할:
 * - Google Maps로 경로 안내 시작
 * - 모바일/웹 공통 (Google Maps 웹 링크 사용)
 * - 우리 앱에서는 경로 계산/라인 표시 안 함 (원칙 준수)
 */

type Place = {
  name: string;
  lat: number;
  lng: number;
  address?: string;
};

/**
 * Google Maps로 길안내 시작
 * 
 * @param place 목적지 장소 정보
 * @param travelMode 이동 수단 ('walking' | 'driving' | 'transit', 기본값: 'walking')
 */
export function startNavigation(place: Place, travelMode: 'walking' | 'driving' | 'transit' = 'walking'): void {
  if (!place || !place.lat || !place.lng || !place.name) {
    console.error('[Navigation] Invalid place data:', place);
    return;
  }

  const { lat, lng } = place;

  // 🔥 Google Maps Direction URL (표준 형식)
  // api=1: 공식 Google Maps Direction API
  // destination: 목적지 좌표 (정확도 최고)
  // travelmode: 이동 수단 (walking/driving/transit)
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=${travelMode}`;

  console.log('[Navigation] Opening Google Maps:', {
    place: place.name,
    lat,
    lng,
    travelMode,
    url: googleMapsUrl,
  });

  // 모바일/웹 공통: 새 탭으로 Google Maps 열기
  window.open(googleMapsUrl, '_blank');
}
