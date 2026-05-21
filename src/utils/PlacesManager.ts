/**
 * 🗺️ Places API 단일 진입점 (Singleton Pattern)
 * 
 * 핵심 원칙:
 * 1. importLibrary 호출은 오직 여기서만
 * 2. 실패해도 Map state 건드리지 않음
 * 3. 준비 상태를 전역으로 관리
 */

import { loadGoogleMapsAPI, isImportLibraryReady, waitForImportLibrary } from "./googleMapsLoader";

// 🔥 전역 Places 준비 상태
let placesLibrary: { Place: typeof google.maps.places.Place } | null = null;
let placesLoadingPromise: Promise<{ Place: typeof google.maps.places.Place }> | null = null;
let placesReady = false;

/**
 * Places API가 준비될 때까지 보장 (Singleton)
 * 여러 곳에서 호출해도 한 번만 로드됨
 */
export async function ensurePlacesReady(): Promise<{ Place: typeof google.maps.places.Place }> {
  // 이미 준비되어 있으면 즉시 반환
  if (placesReady && placesLibrary) {
    return placesLibrary;
  }

  // 이미 로딩 중이면 기존 Promise 반환
  if (placesLoadingPromise) {
    return placesLoadingPromise;
  }

  // 🔥 로딩 Promise 생성 (중복 호출 방지)
  placesLoadingPromise = (async () => {
    try {
      // 1단계: Maps API 로드
      await loadGoogleMapsAPI();

      // 2단계: window.google.maps 존재 확인
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps API가 로드되지 않았습니다.");
      }

      // 3단계: importLibrary 준비 확인
      if (!isImportLibraryReady()) {
        console.log("⏳ importLibrary 준비 대기 중...");
        const isReady = await waitForImportLibrary(5000);
        if (!isReady) {
          throw new Error("importLibrary가 준비되지 않았습니다.");
        }
      }

      // 4단계: Places API 로드
      console.log("🔄 Places API importLibrary 호출 중...");
      placesLibrary = (await window.google.maps.importLibrary("places")) as {
        Place: typeof google.maps.places.Place;
      };

      // 5단계: 검증
      if (!placesLibrary?.Place) {
        throw new Error("Places API 로드 실패: Place 클래스를 찾을 수 없습니다.");
      }

      placesReady = true;
      console.log("✅ Places API 준비 완료 (Singleton)");
      return placesLibrary;
    } catch (error: any) {
      // 🔥 에러 발생 시 Promise 초기화 (재시도 가능하도록)
      placesLoadingPromise = null;
      
      console.error("❌ Places API 준비 실패:", error);
      
      // 🔥 권한 오류 체크
      if (
        error?.message?.includes("not authorized") ||
        error?.message?.includes("ApiTargetBlocked") ||
        error?.message?.includes("PERMISSION_DENIED")
      ) {
        throw new Error("API_KEY_NOT_AUTHORIZED");
      }
      
      throw error;
    }
  })();

  return placesLoadingPromise;
}

/**
 * Places API가 준비되었는지 확인 (동기)
 */
export function isPlacesReady(): boolean {
  return placesReady && placesLibrary !== null;
}

/**
 * Places API 초기화 상태 리셋 (에러 복구용)
 */
export function resetPlacesReady(): void {
  placesReady = false;
  placesLibrary = null;
  placesLoadingPromise = null;
  console.log("🔄 Places API 상태 리셋");
}
