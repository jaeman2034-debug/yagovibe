/**
 * 🚀 Search and Navigate
 * Places 검색 → 최적 선택 → NAVIGATE
 * 결정적 실행 (LLM 없음)
 */

import * as logger from 'firebase-functions/logger';
import { searchGooglePlaces } from '../places/searchPlaces';
import { pickBest } from '../places/score';
import { relaxQuery } from '../recovery/relaxQuery';
import { normalizeNavigateQuery } from '../utils/queryNormalizer';
import type { Place } from '../places/types';

// Server Instruction 타입
export type ServerInstruction =
  | { kind: 'OPEN_SEARCH'; query: string }
  | { kind: 'OPEN_NAVIGATE'; destination: string }
  | { kind: 'NOOP' };

// 확장된 결과 (Places 정보 포함)
export interface SearchAndNavigateResult {
  instruction: ServerInstruction;
  places?: Place[]; // 검색된 Places 결과
  bestPlace?: Place; // 선택된 최적 장소
}

/**
 * Search and Navigate 실행 (기존 호환)
 * 조건 완화 체인 포함
 */
export async function searchAndNavigate(
  query: string,
  isNavigate = false
): Promise<ServerInstruction> {
  const result = await searchAndNavigateExtended(query, isNavigate);
  return result.instruction;
}

/**
 * Search and Navigate 실행 (확장 버전 - Places 정보 포함)
 * 조건 완화 체인 포함
 */
export async function searchAndNavigateExtended(
  query: string,
  isNavigate = false
): Promise<SearchAndNavigateResult> {
  // NAVIGATE 전용 쿼리 보정 ("역" → "역 근처")
  if (isNavigate) {
    query = normalizeNavigateQuery(query);
  }

  // 1. 쿼리 완화 체인 생성
  const relaxedQueries = relaxQuery(query);

  logger.info('🔍 Places 검색 시도:', relaxedQueries);

  // 2. 완화된 쿼리 순서대로 검색 시도 (최대 3회)
  const maxAttempts = Math.min(relaxedQueries.length, 3);
  for (let i = 0; i < maxAttempts; i++) {
    const currentQuery = relaxedQueries[i];
    
    try {
      const places = await searchGooglePlaces(currentQuery);

      if (places.length > 0) {
      logger.info(
        `✅ Places 검색 성공 (${i + 1}단계 완화):`,
        places.length,
        '개 후보'
      );

      // 3. 최적 장소 선택
      const best = pickBest(places);

      if (!best) {
        logger.warn('⚠️ 최적 장소 선택 실패, 검색 화면만 열기');
        return {
          instruction: { kind: 'OPEN_SEARCH', query: currentQuery },
          places,
        };
      }

      logger.info('✅ 최적 장소 선택:', best.name, best.address);

      // 4. NAVIGATE instruction 반환 (Places 정보 포함)
      const destination = `${best.name} ${best.address}`.trim();

        return {
          instruction: {
            kind: 'OPEN_NAVIGATE',
            destination,
          },
          places,
          bestPlace: best,
        };
      }
    } catch (error: any) {
      logger.warn(`⚠️ Places 검색 실패 (${i + 1}단계 완화):`, error);
      // 다음 완화 단계 시도
      continue;
    }

    logger.info(`⚠️ 검색 결과 없음 (${i + 1}단계 완화):`, currentQuery);
  }

  // 5. 모든 완화 시도 후에도 결과 없음
  const finalQuery = relaxedQueries[relaxedQueries.length - 1] || query;
  
  // NAVIGATE 실패 시 raw destination으로 네비 허용 (FIX 3)
  if (isNavigate) {
    logger.info('⚠️ NAVIGATE 검색 결과 없음, raw destination으로 네비 시도');
    return {
      instruction: {
        kind: 'OPEN_NAVIGATE',
        destination: finalQuery,
      },
    };
  }
  
  // SEARCH fallback
  logger.warn('⚠️ 모든 완화 시도 후에도 검색 결과 없음, 검색 화면만 열기');
  return {
    instruction: { kind: 'OPEN_SEARCH', query: finalQuery },
  };
}
