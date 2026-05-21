/**
 * 🔥 Firestore 데이터 Sanitize 유틸리티
 * 
 * Firestore는 undefined 값을 허용하지 않음
 * 이 유틸은 객체에서 모든 undefined 값을 제거
 */

/**
 * 객체에서 undefined 값을 재귀적으로 제거
 * 
 * @param obj 정리할 객체
 * @returns undefined가 제거된 객체
 * 
 * @example
 * const data = {
 *   name: "test",
 *   value: undefined,
 *   nested: {
 *     a: 1,
 *     b: undefined,
 *   }
 * };
 * 
 * removeUndefined(data);
 * // { name: "test", nested: { a: 1 } }
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined) as any;
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // undefined는 제외
      continue;
    }
    
    if (value === null) {
      // null은 유지 (Firestore는 null 허용)
      result[key] = null;
    } else if (typeof value === "object" && !(value instanceof Date)) {
      // 중첩 객체는 재귀적으로 처리
      result[key] = removeUndefined(value);
    } else {
      // 원시값 또는 Date는 그대로
      result[key] = value;
    }
  }
  
  return result as T;
}

/**
 * Firestore에 저장하기 전 데이터 검증 및 정리
 * 
 * @param data 저장할 데이터
 * @returns 정리된 데이터
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): T {
  return removeUndefined(data);
}
