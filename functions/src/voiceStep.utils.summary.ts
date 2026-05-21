/**
 * 📝 결과 요약 생성기
 * Places 결과를 바탕으로 "비서의 한 줄" 생성
 */

import type { Place } from '../places/searchPlaces';

/**
 * Places 결과로 요약 텍스트 생성
 */
export function buildSummary(
  places: Place[],
  query: string,
  instructionKind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE'
): { text: string; tts: string } | null {
  if (places.length === 0) {
    return {
      text: `${query} 검색 결과가 없습니다.`,
      tts: `${query} 검색 결과가 없습니다.`,
    };
  }

  const best = places[0];
  const distance = best.distanceMeters
    ? `${Math.round(best.distanceMeters)}미터`
    : '근처';

  if (instructionKind === 'OPEN_NAVIGATE') {
    return {
      text: `${best.name}로 안내합니다. ${distance} 거리입니다.`,
      tts: `${best.name}로 안내합니다. ${distance} 거리입니다.`,
    };
  }

  // SEARCH인 경우
  if (places.length === 1) {
    return {
      text: `${best.name}를 찾았습니다. ${distance} 거리입니다.`,
      tts: `${best.name}를 찾았습니다. ${distance} 거리입니다.`,
    };
  }

  // 여러 결과
  const top3 = places.slice(0, 3);
  const names = top3.map((p) => p.name).join(', ');
  return {
    text: `${places.length}개를 찾았습니다. ${names} 등이 있습니다.`,
    tts: `${places.length}개를 찾았습니다. ${names} 등이 있습니다.`,
  };
}

/**
 * 간단한 요약 (Places 없이)
 */
export function buildSimpleSummary(
  query: string,
  instructionKind: 'OPEN_SEARCH' | 'OPEN_NAVIGATE'
): { text: string; tts: string } {
  if (instructionKind === 'OPEN_NAVIGATE') {
    return {
      text: `${query}로 안내합니다.`,
      tts: `${query}로 안내합니다.`,
    };
  }

  return {
    text: `${query} 검색 결과를 보여드립니다.`,
    tts: `${query} 검색 결과를 보여드립니다.`,
  };
}
