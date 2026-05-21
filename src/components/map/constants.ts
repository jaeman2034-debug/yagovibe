/**
 * 🔥 지도 관련 상수
 * 
 * 고정 위치 좌표 및 지도 설정
 */

// 🔥 고정 위치: 경기도 의정부시 용민로 420 (37.754, 127.114) - 정확한 좌표
export const MY_LOCATION = {
  lat: 37.754,
  lng: 127.114,
} as const;

// 🔥 Fallback 위치 (GPS 실패 시 사용)
export const FALLBACK_HOME = MY_LOCATION;

// 🔥 지도 기본 줌 레벨
export const DEFAULT_ZOOM = 15;

// 🔥 내 위치 버튼 클릭 시 줌 레벨
export const MY_LOCATION_ZOOM = 16;
