/**
 * 🔥 Phase 18: 공통 지도 타입 정의
 * 
 * Web과 Mobile에서 공통으로 사용하는 타입
 * Single Source of Truth 유지
 */

export type MapCenter = {
  lat: number;
  lng: number;
  source?: 'default' | 'geolocation' | 'map' | 'search' | 'explicit';
};

export type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name?: string;
};

export type MapPageV3Props = {
  center: MapCenter;
  places: MapPlace[];
  recommendedPlaceId?: string;
  selectedPlaceId?: string; // 🔥 Phase 23: 선택된 장소 ID (피드백용)
  highlightedPlaceIds?: Set<string> | string[]; // 🔥 천재 모드: 하이라이트할 장소 ID (상위 3개)
  previewPlace?: { id: string; lat: number; lng: number; name: string } | null; // 🔥 정상 지도 페이지: 단일 마커 상태
  routePath?: Array<{ lat: number; lng: number }>;
  directionsResult?: google.maps.DirectionsResult | null; // 🔥 Phase 33: Directions API 결과 (DirectionsRenderer용)
  navigationStarted?: boolean;
  showDirectionHint?: boolean; // 🔥 Phase 24: 방향 힌트 표시 여부
  locationState?: { lat: number; lng: number } | null; // 🔥 Phase 24: 현재 위치 (방향 힌트 계산용)
  destination?: MapPlace | null; // 🔥 Phase 24: 목적지 (방향 힌트 계산용)
  isSearching?: boolean; // 🔥 Phase 24: 검색 중 여부 (스켈레톤 마커 표시용)
  onMapReady?: () => void;
  onMapLoad?: (map: google.maps.Map) => void; // 🔥 Phase 30: 지도 인스턴스 전달
  onMarkerClick?: (place: MapPlace) => void; // 🔥 Phase 32.1: 마커 클릭 핸들러
  onMapInteraction?: (type: 'dragstart' | 'zoom' | 'idle') => void; // 🔥 인터랙션 단계: 지도 인터랙션 이벤트
};

export type Platform = 'web' | 'ios' | 'android';
