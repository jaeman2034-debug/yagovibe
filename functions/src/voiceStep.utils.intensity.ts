/**
 * 🎯 Intensity 계산 (동사 기반 의도 강도)
 * LLM 없이도 80% 커버
 */

export type Intensity = 'SHOW' | 'SUGGEST' | 'AUTO';

/**
 * 한국어 텍스트에서 의도 강도 추론
 */
export function inferIntensityKorean(text: string): Intensity {
  const autoPatterns = [
    /바로|당장|지금 가|즉시|출발|데려가/,
    /안내해|가줘|길찾기|내비|네비|데려다/,
    /가자|출발해|떠나자/,
  ];

  const suggestPatterns = [
    /가까운|제일 가까운|추천|베스트|좋은 데|최고의/,
    /어떤 게|뭐가|어디가/,
  ];

  // AUTO 우선 체크
  for (const pattern of autoPatterns) {
    if (pattern.test(text)) {
      return 'AUTO';
    }
  }

  // SUGGEST 체크
  for (const pattern of suggestPatterns) {
    if (pattern.test(text)) {
      return 'SUGGEST';
    }
  }

  // 기본값: SHOW ("찾아줘", "어디 있어", "보여줘")
  return 'SHOW';
}
