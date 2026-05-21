/**
 * 🔥 KST 날짜 유틸리티 (시간 제거, 날짜-only 비교)
 * 
 * 원칙:
 * - 모든 날짜 비교는 KST 기준 YYYY-MM-DD 문자열로
 * - Firestore에 저장 시에도 문자열 권장 (UTC/KST 변환 오류 방지)
 * - Timestamp/Date 섞으면 "오늘인데도 예정/종료" 버그 발생
 */

/**
 * KST 기준 날짜 문자열 생성 (YYYY-MM-DD)
 * 
 * @param input Date, string, number 또는 undefined (기본값: 현재 시각)
 * @returns YYYY-MM-DD 형식의 문자열 (KST 기준)
 * 
 * @example
 * kstDateString() // "2026-01-11" (오늘 KST)
 * kstDateString(new Date()) // "2026-01-11"
 * kstDateString("2026-01-11T15:30:00") // "2026-01-11"
 */
export function kstDateString(input?: Date | string | number | null): string {
  if (!input) {
    // 입력이 없으면 오늘 날짜 반환
    const d = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
  
  const d = new Date(input);
  // 유효하지 않은 날짜 체크
  if (isNaN(d.getTime())) {
    console.warn("[kstDateString] 유효하지 않은 날짜 입력:", input);
    // 오늘 날짜 반환 (fallback)
    const today = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);
  }
  
  // 'en-CA' => YYYY-MM-DD 형태 (ISO 8601 날짜 부분만)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * YYYY-MM-DD 문자열끼리 비교 (날짜 순서 보장)
 * 
 * @param a YYYY-MM-DD 형식 문자열
 * @param b YYYY-MM-DD 형식 문자열
 * @returns -1 (a < b), 0 (a === b), 1 (a > b)
 * 
 * @example
 * compareDateStr("2026-01-11", "2026-01-12") // -1
 * compareDateStr("2026-01-11", "2026-01-11") // 0
 * compareDateStr("2026-01-12", "2026-01-11") // 1
 */
export function compareDateStr(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Date 객체를 KST 날짜 문자열로 변환 (기존 Date 유틸과 호환)
 * 
 * @param value Date, Timestamp, string, 또는 null/undefined
 * @returns YYYY-MM-DD 형식의 문자열 또는 null
 */
export function toKstDateString(
  value: Date | string | number | null | undefined
): string | null {
  if (!value) return null;
  try {
    return kstDateString(value);
  } catch (error) {
    console.error("KST 날짜 변환 오류:", error);
    return null;
  }
}

/**
 * 🔥 날짜를 KST 기준 00:00:00으로 정규화 (날짜 비교 전용)
 * 
 * 원칙: 모든 날짜 비교는 이 함수로 정규화 후 비교
 * 
 * @param date Date 객체 또는 문자열
 * @returns KST 기준 00:00:00으로 설정된 Date 객체
 * 
 * @example
 * const today = toKSTDate(new Date()); // 오늘 KST 00:00:00
 * const start = toKSTDate(new Date("2026-01-11")); // 2026-01-11 00:00:00 (KST)
 * today >= start // true (같은 날이면 신청 가능)
 */
export function toKSTDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // KST 날짜 문자열로 변환 후 다시 Date 객체로 (가장 안전한 방법)
  const kstStr = kstDateString(d);
  const [year, month, day] = kstStr.split('-').map(Number);
  
  // KST 기준으로 Date 객체 생성 (로컬 시간대에서 00:00:00)
  const kst = new Date(year, month - 1, day);
  kst.setHours(0, 0, 0, 0);
  
  return kst;
}
