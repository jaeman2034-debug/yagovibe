/**
 * 🔥 Firestore 저장 전 데이터 정리 유틸리티
 * 
 * 역할:
 * - undefined 값 제거
 * - null 값 처리 (선택적)
 * - 빈 문자열 처리 (선택적)
 */

/**
 * 빈 문자열을 null로 변환
 * 
 * @param value - 변환할 값
 * @returns 빈 문자열이면 null, 아니면 원래 값
 * 
 * @example
 * emptyStringToNull("") // null
 * emptyStringToNull("text") // "text"
 * emptyStringToNull(undefined) // null
 */
export function emptyStringToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

/**
 * undefined 값을 제거한 깨끗한 객체 반환
 * 
 * @param data - 정리할 데이터 객체
 * @param options - 정리 옵션
 * @returns undefined가 제거된 객체
 * 
 * @example
 * const cleanData = removeUndefined({
 *   title: "상품명",
 *   brand: undefined,
 *   price: 10000
 * });
 * // { title: "상품명", price: 10000 }
 */
export function removeUndefined<T extends Record<string, any>>(
  data: T,
  options: {
    removeNull?: boolean;      // null도 제거할지 여부 (기본: false)
    removeEmptyString?: boolean; // 빈 문자열도 제거할지 여부 (기본: false)
  } = {}
): Partial<T> {
  const { removeNull = false, removeEmptyString = false } = options;

  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => {
      if (value === undefined) return false;
      if (removeNull && value === null) return false;
      if (removeEmptyString && value === "") return false;
      return true;
    })
  ) as Partial<T>;
}

/**
 * Firestore 저장용 데이터 정리 (undefined만 제거)
 * 
 * @param data - 정리할 데이터 객체
 * @returns Firestore에 저장 가능한 객체
 * 
 * @example
 * const cleanPost = cleanFirestoreData({
 *   title: "상품명",
 *   brand: undefined,
 *   price: 10000,
 *   createdAt: serverTimestamp()
 * });
 */
export function cleanFirestoreData<T extends Record<string, any>>(
  data: T
): Partial<T> {
  return removeUndefined(data, {
    removeNull: false,        // null은 유지 (의도적인 빈 값일 수 있음)
    removeEmptyString: false, // 빈 문자열은 유지 (의도적인 빈 값일 수 있음)
  });
}

/**
 * 필수 필드 검증
 * 
 * @param data - 검증할 데이터 객체
 * @param requiredFields - 필수 필드 목록
 * @returns 검증 결과
 * 
 * @example
 * const validation = validateRequiredFields(postData, ["title", "price", "sport"]);
 * if (!validation.valid) {
 *   throw new Error(validation.message);
 * }
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; message?: string; missingFields?: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      missingFields.push(String(field));
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `필수 필드가 누락되었습니다: ${missingFields.join(", ")}`,
      missingFields,
    };
  }

  return { valid: true };
}

/**
 * Firestore 저장 전 완전한 데이터 정리 및 검증
 * 
 * @param data - 저장할 데이터
 * @param requiredFields - 필수 필드 목록
 * @returns 정리된 데이터
 * @throws 필수 필드 누락 시 에러
 * 
 * @example
 * const cleanPost = prepareFirestoreData(
 *   postData,
 *   ["title", "price", "sport", "category"]
 * );
 */
export function prepareFirestoreData<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[] = []
): Partial<T> {
  // 1. 필수 필드 검증
  if (requiredFields.length > 0) {
    const validation = validateRequiredFields(data, requiredFields);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // 2. undefined 제거
  return cleanFirestoreData(data);
}
