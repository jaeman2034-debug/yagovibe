/**
 * 🔥 참가 신청 기간 상태 판정 (프론트/서버 공용)
 * 
 * 원칙:
 * - KST 기준 YYYY-MM-DD 문자열로만 비교
 * - 오늘 포함 정책 (오늘 = 신청 가능)
 * - 모든 날짜 비교 로직을 여기로 통일
 */

import { kstDateString, compareDateStr } from "@/utils/dateKST";

/**
 * 참가 신청 상태
 */
export type ApplyStatus = "upcoming" | "open" | "closed";

/**
 * 참가 신청 상태 판정
 * 
 * @param params.applyStart 신청 시작일 (YYYY-MM-DD)
 * @param params.applyEnd 신청 종료일 (YYYY-MM-DD)
 * @param params.now 현재 날짜 (YYYY-MM-DD, KST) - 기본값: 오늘
 * @returns "upcoming" | "open" | "closed"
 * 
 * @example
 * getApplyStatus({
 *   applyStart: "2026-01-11",
 *   applyEnd: "2026-01-15",
 * }) // 오늘이 1/11이면 "open", 1/10이면 "upcoming", 1/16이면 "closed"
 */
export function getApplyStatus(params: {
  applyStart: string; // YYYY-MM-DD
  applyEnd: string;   // YYYY-MM-DD
  now?: string;       // YYYY-MM-DD (KST, 기본값: 오늘)
}): ApplyStatus {
  const now = params.now ?? kstDateString();
  const { applyStart, applyEnd } = params;

  // now < start → 예정
  if (compareDateStr(now, applyStart) < 0) return "upcoming";
  
  // now > end → 종료
  if (compareDateStr(now, applyEnd) > 0) return "closed";
  
  // start <= now <= end → 신청 가능 (오늘 포함)
  return "open";
}

/**
 * 신청 가능 여부만 빠르게 확인
 */
export function canApply(params: {
  applyStart: string;
  applyEnd: string;
  now?: string;
}): boolean {
  return getApplyStatus(params) === "open";
}

/**
 * 🔥 신청 가능 여부 검증 (Date 객체 기반, KST 00:00 정규화)
 * 
 * 프론트/공통 유틸로 사용
 * 
 * @param applyStart 신청 시작일 (Date 또는 ISO string)
 * @param applyEnd 신청 종료일 (Date 또는 ISO string)
 * @returns 신청 가능 여부
 */
export function isApplicationOpen(
  applyStart: Date | string,
  applyEnd: Date | string
): boolean {
  const today = toKSTDate(new Date());
  const start = toKSTDate(applyStart);
  const end = toKSTDate(applyEnd);

  return today >= start && today <= end;
}
