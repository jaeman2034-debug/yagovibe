/**
 * 🔥 참가 신청 기간 제어 유틸리티
 * 
 * 커서 지시문 1️⃣, 2️⃣ 기반:
 * - 참가 신청은 정해진 신청 기간 내에만 가능
 * - 신청 기간 종료 후에는 신규 신청 불가
 * - 선수 명단은 신청 기간 내에만 입력/수정 가능
 * - 사무국 요청에 의한 제한적 수정만 허용
 */

import type { Tournament } from "@/types/tournament";
import { kstDateString, compareDateStr } from "@/utils/dateKST";
import { getApplyStatus, type ApplyStatus } from "@/domain/applicationWindow";

/**
 * 신청 기간 상태
 */
export type RegistrationPeriodStatus = 
  | "not_started" // 신청 기간 전
  | "open" // 신청 기간 중
  | "closed" // 신청 기간 종료
  | "roster_edit_only"; // 명단 수정만 가능 (신청 마감 후 ~ 명단 수정 마감 전)

/**
 * 신청 기간 체크 결과
 */
export interface RegistrationPeriodCheck {
  status: RegistrationPeriodStatus;
  canApply: boolean; // 새 신청 가능 여부
  canEditRoster: boolean; // 명단 수정 가능 여부
  canEditRosterLimited: boolean; // 제한적 수정 가능 여부 (사무국 요청)
  message: string; // 사용자에게 표시할 메시지
  daysUntilStart?: number; // 시작까지 남은 일수
  daysUntilEnd?: number; // 마감까지 남은 일수
  daysUntilRosterDeadline?: number; // 명단 수정 마감까지 남은 일수
}

/**
 * 현재 날짜 기준 신청 기간 상태 확인
 */
export function checkRegistrationPeriod(
  tournament: Tournament | null,
  now: Date = new Date()
): RegistrationPeriodCheck {
  // 🔥 tournament가 없으면 종료 상태 반환 (안전 처리)
  if (!tournament) {
    return {
      status: "closed",
      canApply: false,
      canEditRoster: false,
      canEditRosterLimited: false,
      message: "대회 정보를 불러오는 중입니다.",
    };
  }

  const period = tournament.registrationPeriod;
  
  // 신청 기간 미설정 시 기본 동작 (registrationOpen 필드 기반)
  if (!period) {
    if (tournament.registrationOpen) {
      return {
        status: "open",
        canApply: true,
        canEditRoster: true,
        canEditRosterLimited: false,
        message: "참가 신청이 진행 중입니다.",
      };
    }
    return {
      status: "closed",
      canApply: false,
      canEditRoster: false,
      canEditRosterLimited: false,
      message: "참가 신청이 마감되었습니다.",
    };
  }

  // 🔥 KST 기준 날짜 문자열로 변환 (시간 정보 제거, 오늘 포함 정책)
  // 안전 처리: period.startDate/endDate가 없으면 빈 문자열로 처리
  const today = kstDateString(now);
  const start = period.startDate ? kstDateString(period.startDate) : "";
  const end = period.endDate ? kstDateString(period.endDate) : "";
  
  // 날짜가 없으면 종료 상태 반환
  if (!start || !end) {
    return {
      status: "closed",
      canApply: false,
      canEditRoster: false,
      canEditRosterLimited: false,
      message: "신청 기간이 설정되지 않았습니다.",
    };
  }

  const rosterDeadline = period.rosterEditDeadline 
    ? kstDateString(period.rosterEditDeadline)
    : end;

  // 🔥 신청 상태 판정 (통일된 로직)
  const applyStatus = getApplyStatus({
    applyStart: start,
    applyEnd: end,
    now: today,
  });

  // 일수 계산
  const msPerDay = 24 * 60 * 60 * 1000;
  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);
  const rosterDeadlineDate = period.rosterEditDeadline 
    ? new Date(period.rosterEditDeadline)
    : endDate;
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  
  const daysUntilStart = Math.ceil((startDate.getTime() - todayDate.getTime()) / msPerDay);
  const daysUntilEnd = Math.ceil((endDate.getTime() - todayDate.getTime()) / msPerDay);
  const daysUntilRosterDeadline = Math.ceil((rosterDeadlineDate.getTime() - todayDate.getTime()) / msPerDay);

  // 1️⃣ 신청 기간 전 (upcoming)
  if (applyStatus === "upcoming") {
    return {
      status: "not_started",
      canApply: false,
      canEditRoster: false,
      canEditRosterLimited: false,
      message: `참가 신청이 ${formatDate(period.startDate)}부터 시작됩니다.`,
      daysUntilStart,
      daysUntilEnd,
      daysUntilRosterDeadline,
    };
  }

  // 2️⃣ 신청 기간 중 (open, 오늘 포함)
  if (applyStatus === "open") {
    return {
      status: "open",
      canApply: true,
      canEditRoster: true,
      canEditRosterLimited: false,
      message: `참가 신청 마감: ${formatDate(period.endDate)} (${daysUntilEnd}일 남음)`,
      daysUntilEnd,
      daysUntilRosterDeadline,
    };
  }

  // 3️⃣ 신청 마감 후 ~ 명단 수정 마감 전
  if (applyStatus === "closed" && compareDateStr(today, rosterDeadline) <= 0) {
    return {
      status: "roster_edit_only",
      canApply: false,
      canEditRoster: true,
      canEditRosterLimited: false,
      message: `신규 신청 마감. 선수 명단 수정 마감: ${formatDate(period.rosterEditDeadline || period.endDate)} (${daysUntilRosterDeadline}일 남음)`,
      daysUntilRosterDeadline,
    };
  }

  // 4️⃣ 모든 기간 종료
  return {
    status: "closed",
    canApply: false,
    canEditRoster: false,
    canEditRosterLimited: period.allowLateEdit ?? false, // 사무국 허용 시만
    message: period.allowLateEdit 
      ? "신청 마감. 사무국 요청에 의한 제한적 수정만 가능합니다."
      : "참가 신청 및 선수 명단 수정이 모두 마감되었습니다.",
  };
}

/**
 * 신청 가능 여부만 빠르게 확인
 */
export function canApplyForTournament(tournament: Tournament, now: Date = new Date()): boolean {
  return checkRegistrationPeriod(tournament, now).canApply;
}

/**
 * 명단 수정 가능 여부만 빠르게 확인
 */
export function canEditRoster(tournament: Tournament, now: Date = new Date()): boolean {
  const check = checkRegistrationPeriod(tournament, now);
  return check.canEditRoster || check.canEditRosterLimited;
}

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일)
 * Date 또는 string (YYYY-MM-DD) 모두 지원
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

