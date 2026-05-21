/**
 * 🔥 v4 SEARCH ONLY: Place 정규화 유틸리티
 * Places API 결과를 즉시 정규화하여 UI/Map에서 안전하게 사용 가능한 형태로 변환
 * 
 * ⭐⭐⭐ Single Source of Truth: 여기서만 Places API 응답을 해석한다
 * 다른 모든 컴포넌트는 정규화된 PlaceLite만 받는다
 */

import type { PlaceLite } from '@/types/search';

/**
 * Google Places PlaceResult를 정규화된 PlaceLite로 변환
 * @param raw Google Places API 결과 (any 타입으로 모든 형태 수용)
 * @returns 정규화된 PlaceLite 또는 null (유효하지 않은 경우)
 * 
 * 🔥 핵심: 여기서 null이 떨어지면 지도/리스트/추천 어디에도 나타나지 않음
 */
export function normalizePlace(raw: any): PlaceLite | null {
  // 🔥 STEP 1: normalizePlace 입구에서 무조건 차단
  if (!raw) {
    console.warn('[normalizePlace] INVALID DETAIL: raw가 null/undefined', raw);
    return null;
  }

  // 🔥 geometry.location 필수 검증 (가장 중요)
  if (!raw.geometry?.location) {
    console.warn('[normalizePlace] INVALID DETAIL: geometry.location 없음', {
      hasRaw: !!raw,
      hasGeometry: !!raw.geometry,
      hasLocation: !!raw.geometry?.location,
      raw: raw,
    });
    return null;
  }

  // 🔥 1단계: ID 추출 (여러 형태 지원)
  const id = raw.place_id || raw.id || raw.placeId || null;
  if (!id) {
    console.warn('[normalizePlace] INVALID DETAIL: id 없음', raw);
    return null;
  }

  // 🔥 2단계: name 추출 (여러 형태 지원)
  const name = 
    raw.name || 
    raw.place_name || 
    raw.displayName?.text || 
    raw.displayName || 
    raw.title || 
    null;
  
  if (!name || !name.trim()) {
    console.warn('[normalizePlace] INVALID DETAIL: name 없음', {
      id,
      formatted_address: raw.formatted_address,
      displayName: raw.displayName,
    });
    return null;
  }

  // 🔥 3단계: 좌표 추출 (여러 형태 지원)
  // Google Places API는 여러 형태로 좌표를 제공할 수 있음
  let lat: number | null = null;
  let lng: number | null = null;

  // Case 1: geometry.location (가장 일반적)
  if (raw.geometry?.location) {
    const loc = raw.geometry.location;
    if (typeof loc.lat === 'function') {
      lat = Number(loc.lat());
      lng = Number(loc.lng());
    } else {
      lat = Number(loc.lat);
      lng = Number(loc.lng);
    }
  }
  // Case 2: location (직접 속성)
  else if (raw.location) {
    if (typeof raw.location.lat === 'function') {
      lat = Number(raw.location.lat());
      lng = Number(raw.location.lng());
    } else {
      lat = Number(raw.location.lat);
      lng = Number(raw.location.lng);
    }
  }
  // Case 3: lat/lng 직접 속성
  else if (raw.lat !== undefined && raw.lng !== undefined) {
    lat = Number(raw.lat);
    lng = Number(raw.lng);
  }
  // Case 4: latitude/longitude (일부 API 형태)
  else if (raw.latitude !== undefined && raw.longitude !== undefined) {
    lat = Number(raw.latitude);
    lng = Number(raw.longitude);
  }
  // Case 5: y/x (일부 API 형태)
  else if (raw.y !== undefined && raw.x !== undefined) {
    lat = Number(raw.y);
    lng = Number(raw.x);
  }

  // 🔥 4단계: 좌표 유효성 검증
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn('[normalizePlace] 좌표가 유효하지 않음:', {
      id,
      name: name.trim(),
      lat,
      lng,
      hasGeometry: !!raw.geometry,
      hasLocation: !!raw.location,
    });
    return null;
  }

  // 🔥 5단계: address 추출 (여러 형태 지원)
  const address = (
    raw.formatted_address ||
    raw.formattedAddress ||
    raw.road_address_name ||
    raw.address_name ||
    raw.vicinity ||
    raw.shortFormattedAddress ||
    ''
  ).trim();

  // 🔥 6단계: types 추출
  const types = raw.types || raw.primaryType ? [raw.primaryType] : [];

  // 🔥 7단계: 정규화된 PlaceLite 반환
  return {
    id: String(id),
    name: String(name).trim(),
    address: address || '', // 🔥 빈 문자열 허용 (address는 optional)
    lat: Number(lat),
    lng: Number(lng),
    types: Array.isArray(types) ? types : [],
  };
}

/**
 * PlaceResult 배열을 정규화된 PlaceLite 배열로 변환
 * @param places Google Places API 결과 배열
 * @returns 정규화된 PlaceLite 배열 (유효하지 않은 항목은 제외)
 */
export function normalizePlaces(
  places: google.maps.places.PlaceResult[]
): PlaceLite[] {
  return places
    .map(normalizePlace)
    .filter((p): p is PlaceLite => p !== null);
}
