/**
 * 🔧 Query Normalizer
 * NAVIGATE 전용 쿼리 보정
 */

/**
 * "역" → "역 근처" 보정
 * NAVIGATE 시 단일 목적지 검색 성공률 향상
 */
export function normalizeNavigateQuery(query: string): string {
  // "역" 포함 시 "역 근처"로 보정
  if (query.includes('역') && !query.includes('근처')) {
    return query.replace('역', '역 근처');
  }
  return query;
}
