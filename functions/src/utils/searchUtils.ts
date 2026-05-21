/**
 * 🔥 Search 유틸리티 함수
 * 
 * 역할:
 * - 검색 텍스트 정규화
 * - 검색 키워드 생성
 */

/**
 * 검색 텍스트 정규화
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 검색 키워드 생성 (prefix 기반)
 */
export function generateSearchKeywords(text: string): string[] {
  const normalized = normalizeSearchText(text);
  const keywords: string[] = [];

  // 1글자부터 전체까지 모든 prefix
  for (let i = 1; i <= normalized.length; i++) {
    keywords.push(normalized.substring(0, i));
  }

  return keywords;
}
