// src/utils/extractDongFromAddress.ts
// 주소 문자열에서 동 이름을 추출하는 유틸리티

/**
 * 주소 문자열에서 동 이름을 추출합니다.
 * 예: "서울 강남구 역삼동" → "역삼동"
 *     "서울특별시 강남구 역삼동 123" → "역삼동"
 */
export function extractDongFromAddress(address: string): string | null {
  if (!address || typeof address !== "string") {
    return null;
  }

  // 공백으로 분리
  const parts = address.trim().split(/\s+/);
  
  // 마지막 부분이 "동" 또는 "리"로 끝나는지 확인
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.endsWith("동") || part.endsWith("리")) {
      return part;
    }
  }

  // "동"으로 끝나는 부분이 없으면, 마지막 단어 반환 (fallback)
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    // 숫자만 있으면 제외
    if (!/^\d+$/.test(lastPart)) {
      return lastPart;
    }
  }

  return null;
}

