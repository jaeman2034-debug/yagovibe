/**
 * 🛠️ Voice Step 유틸리티
 */

import type { AgentResult } from './agent/runAgent';

/**
 * 메모리에서 마지막 목적지 파싱
 * 공백/형식 흔들림 방어 강화 버전
 */
export function parseLastDestination(memory: string): string | null {
  if (!memory) return null;

  // 첫 줄(0번)만 보되, 포맷 흔들려도 잡히게
  const firstLine = memory
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.startsWith('0.')) ?? '';

  if (!firstLine) return null;

  // "0. ... -> DEST" 형태를 유연하게 매칭
  const m = firstLine.match(/^0\.\s*(.*?)\s*->\s*(.+)$/);
  if (!m) return null;

  const dest = (m[2] ?? '').trim();

  // dest가 의미없는 값이면 null 처리
  if (!dest) return null;
  if (
    dest === 'search_only' ||
    dest === '검색만' ||
    dest === '(empty)' ||
    dest === 'empty'
  ) {
    return null;
  }

  return dest;
}

/**
 * 반복 지시어 판단
 * "아까", "방금", "그거", "거기", "그곳", "다시", "또" 포함 여부
 * 단, "말고", "다른" 포함 시 제외 (SEARCH_ALTERNATIVE)
 */
export function looksLikeRepeat(text: string): boolean {
  // "말고", "다른" 포함 시 반복 지시어 아님
  if (/(말고|다른)/.test(text)) {
    return false;
  }
  return /(아까|방금|그거|거기|그곳|다시|또|그 데)/.test(text);
}

/**
 * 쿼리 + 필터 조합
 */
export function composeQuery(
  query: string,
  filters: AgentResult['filters']
): string {
  const hints: string[] = [];

  if (filters.openNow) hints.push('지금 영업중');
  if (filters.parking) hints.push('주차');
  if (filters.sort === 'NEAREST') hints.push('가까운');
  if (filters.sort === 'BEST_RATED') hints.push('평점 높은');

  return [query, ...hints].filter(Boolean).join(' ').trim();
}
