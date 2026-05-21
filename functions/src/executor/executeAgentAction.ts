/**
 * ⚙️ Execute Agent Action
 * 서버 결정 흐름 (실행은 안 함, 결정만)
 */

import * as logger from "firebase-functions/logger";
import { searchGooglePlaces } from "../places/searchPlaces";
import { searchWithRelaxedFilters } from "../recovery/relaxFilters";
import { selectBestPlaceByRating } from "../recovery/fallback";
import { selectBestPlaceWithLLM } from "./selectBestPlace";

export interface ExecuteAgentActionParams {
  action: "SEARCH" | "NAVIGATE" | "REPEAT_LAST" | "SEARCH_ALTERNATIVE" | "NONE";
  query: string;
  filters: {
    openNow: boolean;
    parking: boolean;
    sort: "NEAREST" | "BEST_RATED" | "DEFAULT";
  };
  userText: string;
  autoNavigate?: boolean;
}

export interface ExecuteResult {
  action: "NAVIGATE" | "OPEN_SEARCH" | "NONE";
  destination?: string;
  query?: string;
  filters?: {
    openNow: boolean;
    parking: boolean;
    sort: "NEAREST" | "BEST_RATED" | "DEFAULT";
  };
  place?: {
    name: string;
    address: string;
    rating: number;
  };
}

/**
 * Agent Action 실행 (서버 결정 흐름)
 */
export async function executeAgentAction(
  params: ExecuteAgentActionParams
): Promise<ExecuteResult> {
  const { action, query, filters, userText, autoNavigate = false } = params;

  logger.info("🚀 Execute Agent Action:", action, query);

  // MAP_SEARCH가 아니면 바로 종료
  if (action !== "SEARCH" && action !== "NAVIGATE") {
    return {
      action: "NONE",
    };
  }

  // Places 검색
  let places = await searchGooglePlaces(query);

  // 결과가 없으면 조건 완화 재검색
  if (places.length === 0 && filters) {
    logger.info("🛡️ 검색 결과 없음, 조건 완화 재검색 시도");
    places = await searchWithRelaxedFilters(query, filters);
  }

  // autoNavigate가 false이면 검색만
  if (!autoNavigate) {
    return {
      action: "OPEN_SEARCH",
      query,
      filters,
    };
  }

  // 검색 결과가 여전히 없으면 검색 화면만
  if (places.length === 0) {
    logger.warn("⚠️ 조건 완화 후에도 검색 결과 없음, 검색 화면만 열기");
    return {
      action: "OPEN_SEARCH",
      query,
      filters,
    };
  }

  // autoNavigate=true면 후보 선택
  let selectedIndex: number;
  try {
    selectedIndex = await selectBestPlaceWithLLM(userText, places);
  } catch (error: any) {
    logger.warn("⚠️ LLM 선택 실패, fallback 사용:", error);
    selectedIndex = selectBestPlaceByRating(places);
  }

  const target = places[selectedIndex] || places[0];

  logger.info("✅ 선택된 장소:", target.name, target.address);

  const destination = `${target.name} ${target.address}`;

  return {
    action: "NAVIGATE",
    destination: destination.trim(),
    place: {
      name: target.name,
      address: target.address,
      rating: target.rating,
    },
  };
}
