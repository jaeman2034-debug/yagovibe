/**
 * 🛡️ Filter Relaxation
 * 조건 완화 검색 (검색 결과 0개 시)
 */

import * as logger from "firebase-functions/logger";
import { searchGooglePlaces } from "../places/searchPlaces";

export interface Filters {
  parking?: boolean;
  openNow?: boolean;
  sort?: string;
}

/**
 * 조건 완화 검색
 * 완화 순서: parking → openNow → sort
 */
export async function searchWithRelaxedFilters(
  query: string,
  filters: Filters
): Promise<any[]> {
  let relaxedFilters = { ...filters };

  // 최대 3번 완화 시도
  for (let attempt = 0; attempt < 3; attempt++) {
    const results = await searchGooglePlaces(query);

    // 결과가 있으면 반환
    if (results.length > 0) {
      logger.info(`✅ 조건 완화 후 검색 성공 (시도 ${attempt + 1}):`, results.length);
      return results;
    }

    // 조건 완화 순서: parking → openNow → sort
    if (relaxedFilters.parking) {
      logger.info("🛡️ 조건 완화: parking 제거");
      relaxedFilters.parking = false;
    } else if (relaxedFilters.openNow) {
      logger.info("🛡️ 조건 완화: openNow 제거");
      relaxedFilters.openNow = false;
    } else if (relaxedFilters.sort && relaxedFilters.sort !== "DEFAULT") {
      logger.info("🛡️ 조건 완화: sort = DEFAULT");
      relaxedFilters.sort = "DEFAULT";
    } else {
      // 더 이상 완화할 조건 없음
      break;
    }
  }

  logger.warn("⚠️ 조건 완화 후에도 검색 결과 없음");
  return [];
}
