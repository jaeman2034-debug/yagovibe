// src/lib/loadGoogleMap.ts
// 🔥 중복 로딩 방지: googleMapsLoader.ts의 중앙 집중식 로더 사용

import { loadGoogleMapsAPI } from "@/utils/googleMapsLoader";

let googleLoaded: Promise<typeof google> | null = null;

export function loadGoogleMap(): Promise<typeof google> {
  if (googleLoaded) return googleLoaded;

  googleLoaded = new Promise(async (resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is undefined"));
      return;
    }

    // 이미 로드되어 있으면 즉시 반환
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    try {
      // 🔥 중앙 집중식 로더 사용 (중복 방지 보장)
      await loadGoogleMapsAPI();
      
      // 로드 완료 후 window.google 확인
      if (window.google && window.google.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps 로드 실패 - window.google이 없습니다."));
      }
    } catch (error) {
      reject(error);
    }
  });

  return googleLoaded;
}
