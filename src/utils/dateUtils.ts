/**
 * 날짜 유틸리티 함수
 * Firestore Timestamp를 안전하게 Date로 변환
 */

import { Timestamp } from "firebase/firestore";

/**
 * Firestore Timestamp 또는 Date를 안전하게 Date 객체로 변환
 * @param value Timestamp, Date, 또는 null/undefined
 * @returns Date 객체 또는 null
 */
export function safeToDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  
  // 이미 Date 객체인 경우
  if (value instanceof Date) return value;
  
  // Firestore Timestamp인 경우
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.error("날짜 변환 오류:", error);
      return null;
    }
  }
  
  // 문자열인 경우 (예: ISO string)
  if (typeof value === 'string') {
    try {
      return new Date(value);
    } catch (error) {
      console.error("날짜 문자열 파싱 오류:", error);
      return null;
    }
  }
  
  return null;
}

/**
 * 날짜를 한국어 형식으로 포맷
 * @param value Timestamp, Date, 또는 null/undefined
 * @param options Intl.DateTimeFormatOptions
 * @returns 포맷된 날짜 문자열 또는 "-"
 */
export function formatDate(
  value: Timestamp | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = safeToDate(value);
  if (!date) return "-";
  
  try {
    return date.toLocaleDateString("ko-KR", options || {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("날짜 포맷 오류:", error);
    return "-";
  }
}

/**
 * 날짜를 간단한 형식으로 포맷 (YYYY.MM.DD)
 * @param value Timestamp, Date, 또는 null/undefined
 * @returns 포맷된 날짜 문자열 또는 "-"
 */
export function formatDateShort(
  value: Timestamp | Date | null | undefined
): string {
  const date = safeToDate(value);
  if (!date) return "-";
  
  try {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    console.error("날짜 포맷 오류:", error);
    return "-";
  }
}

/**
 * 🔥 날짜를 일 단위로만 정규화 (시간 정보 제거)
 * 
 * 날짜 비교 시 시간 정보로 인한 오류를 방지하기 위해
 * 모든 날짜를 해당 날짜의 00:00:00으로 정규화합니다.
 * 
 * @param date Date 객체 또는 ISO string
 * @returns 시간 정보가 제거된 Date 객체 (해당 날짜의 00:00:00)
 * 
 * @example
 * const today = toDateOnly(new Date()); // 2026-01-11 00:00:00
 * const start = toDateOnly("2026-01-11"); // 2026-01-11 00:00:00
 * today >= start // true (같은 날이면 신청 가능)
 */
export function toDateOnly(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  // KST 기준으로 날짜만 추출 (시간 제거)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

