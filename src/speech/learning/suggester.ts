// src/speech/learning/suggester.ts
// 🔥 Phase 6-3: 자동 제안 로직 (Rule-first)
// ✅ NLP보다 Rule 확장이 비용 대비 효과 큼

import type { UnknownPattern } from "./aggregator";

export interface Suggestion {
  hash: string;
  pathname: string;
  count: number;
  suggestedIntent: "ALIAS" | "RULE" | "NLP_EXAMPLE" | "BLACKLIST";
  suggestedPayload: {
    keywords?: string[];
    rule?: string;
    promptExample?: string;
  };
  confidence: number; // 제안 신뢰도 (0~1)
}

/**
 * 자동 제안 로직 (Rule-first)
 * 
 * 자동 제안 규칙:
 * - 같은 hash가 N회 이상 (예: 10회)
 * - pathname이 고정
 * - 기존 intent와 의미적으로 근접
 * → alias 후보 생성
 */
export function suggestImprovements(
  patterns: UnknownPattern[],
  existingRules: string[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const pattern of patterns) {
    // 🔥 Rule-first: 기존 rule과 유사한 패턴 찾기
    const similarRule = findSimilarRule(pattern.hash, existingRules);
    
    if (similarRule) {
      // ALIAS 제안
      suggestions.push({
        hash: pattern.hash,
        pathname: pattern.pathname,
        count: pattern.count,
        suggestedIntent: "ALIAS",
        suggestedPayload: {
          keywords: [pattern.hash], // 실제로는 hash → 원문 매핑 필요
        },
        confidence: 0.8, // Rule 기반이므로 높은 신뢰도
      });
    } else if (pattern.count >= 20) {
      // 🔥 NLP 예제 제안 (Rule로 커버 불가한 상위 패턴)
      suggestions.push({
        hash: pattern.hash,
        pathname: pattern.pathname,
        count: pattern.count,
        suggestedIntent: "NLP_EXAMPLE",
        suggestedPayload: {
          promptExample: `User: "${pattern.hash}"\nIntent: UNKNOWN`, // 실제로는 hash → 원문 매핑 필요
        },
        confidence: 0.6, // NLP는 낮은 신뢰도
      });
    }
  }

  return suggestions.sort((a, b) => b.count - a.count);
}

/**
 * 기존 rule과 유사한 패턴 찾기 (간단한 휴리스틱)
 */
function findSimilarRule(hash: string, existingRules: string[]): string | null {
  // 실제로는 hash → 원문 매핑이 필요하지만, 여기서는 간단히 구현
  // 향후: hash 역추적 또는 사용자 피드백으로 원문 수집
  
  // 예시: hash가 기존 rule 키워드와 유사한지 체크
  for (const rule of existingRules) {
    // 간단한 유사도 체크 (실제로는 더 정교한 알고리즘 필요)
    if (hash.includes(rule.substring(0, 3)) || rule.includes(hash.substring(0, 3))) {
      return rule;
    }
  }
  
  return null;
}

