/**
 * 🔥 Region Cache - 지역별 캐시 전략
 * 
 * 캐시 키: sporthub:{region}
 */

import type { Region } from "../domain/region.types";

const CACHE_PREFIX = "sporthub";

/**
 * 지역별 캐시 키 생성
 */
export function getRegionCacheKey(region: Region, type: "stories" | "grounds" | "teams"): string {
  return `${CACHE_PREFIX}:${region}:${type}`;
}

/**
 * 지역별 캐시 저장
 */
export function saveRegionCache<T>(region: Region, type: "stories" | "grounds" | "teams", data: T): void {
  try {
    const key = getRegionCacheKey(region, type);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("[RegionCache] 저장 실패:", error);
  }
}

/**
 * 지역별 캐시 로드
 */
export function loadRegionCache<T>(
  region: Region,
  type: "stories" | "grounds" | "teams"
): T | null {
  try {
    const key = getRegionCacheKey(region, type);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 모든 지역 캐시 클리어
 */
export function clearAllRegionCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // 무시
  }
}
