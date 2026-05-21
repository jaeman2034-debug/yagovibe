// src/speech/learning/blacklist.ts
// 🔥 Phase 6-3: 블랙리스트 (지원 안 할 명령 명확히 차단)
// ✅ 이 패턴은 영구 UNKNOWN, NLP에도 보내지 않음 (비용 절약)

/**
 * 블랙리스트 패턴
 * 
 * 지원 안 할 명령을 명확히 막아야 UX가 안정
 * NLP에도 보내지 않음 (비용 절약)
 */
const BLACKLIST_PATTERNS = [
  // 애매한 지시어
  /^(그거|이거|저거|아무거나|아무것|뭐든지)/,
  // 불완전한 문장
  /^(그|이|저|뭐|어떤|어디|언제|누구|왜)$/,
  // 맥락 없는 단어
  /^(가|와|을|를|은|는|이|가|의|에|에서|로|으로)$/,
  // 너무 짧은 입력 (2자 이하)
  /^.{0,2}$/,
];

/**
 * 블랙리스트 체크
 * 
 * @returns true면 블랙리스트에 해당 (UNKNOWN으로 처리, NLP 호출 안 함)
 */
export function isBlacklisted(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  
  for (const pattern of BLACKLIST_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 블랙리스트에 추가 (런타임, 관리자용)
 */
export function addToBlacklist(pattern: string | RegExp): void {
  if (typeof pattern === "string") {
    BLACKLIST_PATTERNS.push(new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  } else {
    BLACKLIST_PATTERNS.push(pattern);
  }
}

