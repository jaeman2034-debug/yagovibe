/**
 * 🔥 Experiment Assign - AB 테스트 할당 (서버판)
 * 
 * Week4 핵심: 일관된 variant 할당
 */

/**
 * AB 테스트 variant 할당
 * 
 * @param userId 사용자 ID (null이면 세션 기반)
 * @param key 실험 키
 * @returns "A" 또는 "B"
 */
export function assignVariant(
  userId: string | null,
  key: string
): "A" | "B" {
  // 시드 생성: userId가 있으면 userId:key, 없으면 타임스탬프 기반
  const seed = userId ? `${userId}:${key}` : `${Date.now()}:${key}`;

  // 간단한 해시 함수 (일관성 보장)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  // 50:50 분할
  return hash % 2 === 0 ? "A" : "B";
}

/**
 * 여러 실험에 대한 할당 결과
 */
export function assignMultipleVariants(
  userId: string | null,
  keys: string[]
): Record<string, "A" | "B"> {
  const result: Record<string, "A" | "B"> = {};
  for (const key of keys) {
    result[key] = assignVariant(userId, key);
  }
  return result;
}
