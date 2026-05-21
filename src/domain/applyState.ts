/**
 * 🔥 참가 신청 가능 상태 통합 도메인 로직
 * 
 * 단일 진실 소스 (Single Source of Truth)
 * - 모든 UI 요소가 이 함수 결과만 사용
 * - 배너 / 버튼 / 모달 진입 조건 100% 일치
 */

import type { Tournament } from "@/types/tournament";
import { checkRegistrationPeriod } from "@/lib/tournament/registrationPeriod";
import { kstDateString } from "@/utils/dateKST";

/**
 * 신청 차단 사유
 */
export type ApplyBlockReason =
  | "NOT_STARTED" // 신청 기간 전
  | "ENDED" // 신청 기간 종료
  | "FULL" // 정원 마감
  | "ALREADY_APPLIED" // 이미 신청함
  | "DRAW_EXECUTED" // 추첨 완료
  | "TOURNAMENT_ENDED" // 대회 종료
  | "TOURNAMENT_ONGOING" // 대회 진행 중
  | null; // 차단 없음 (신청 가능)

/**
 * 신청 가능 상태
 */
export interface ApplyState {
  canApply: boolean; // 신청 가능 여부
  blockReason: ApplyBlockReason; // 차단 사유 (null이면 가능)
  message: string; // 사용자에게 표시할 메시지
  startDate?: Date | string; // 신청 시작일 (NOT_STARTED일 때)
}

/**
 * 신청 가능 상태 계산 (단일 진실 소스)
 * 
 * @param tournament 대회 정보
 * @param entryStatus 현재 사용자의 신청 상태 ("none" | "applied" | "confirmed")
 * @param now 현재 시각 (기본값: new Date())
 * @returns 신청 가능 상태
 */
export function getApplyState(
  tournament: Tournament | null,
  entryStatus: "none" | "applied" | "confirmed" = "none",
  now: Date = new Date()
): ApplyState {
  // 🔥 tournament가 없으면 종료 상태
  if (!tournament) {
    return {
      canApply: false,
      blockReason: "ENDED",
      message: "대회 정보를 불러오는 중입니다.",
    };
  }

  // 🔥 이미 신청한 경우
  if (entryStatus === "applied") {
    return {
      canApply: false,
      blockReason: "ALREADY_APPLIED",
      message: "신청이 접수되었습니다. 협회 승인을 기다려주세요.",
    };
  }

  if (entryStatus === "confirmed") {
    return {
      canApply: false,
      blockReason: "ALREADY_APPLIED",
      message: "참가가 확정되었습니다.",
    };
  }

  // 🔥 대회 상태 체크
  if (tournament.status === "ended") {
    return {
      canApply: false,
      blockReason: "TOURNAMENT_ENDED",
      message: "종료된 대회입니다. 신청할 수 없습니다.",
    };
  }

  if (tournament.status === "ongoing") {
    return {
      canApply: false,
      blockReason: "TOURNAMENT_ONGOING",
      message: "진행 중인 대회입니다. 신청할 수 없습니다.",
    };
  }

  // 🔥 추첨 완료 체크
  if (tournament.drawExecuted) {
    return {
      canApply: false,
      blockReason: "DRAW_EXECUTED",
      message: "조 추첨이 완료되어 신청이 마감되었습니다.",
    };
  }

  // 🔥 신청 기간 체크
  const periodCheck = checkRegistrationPeriod(tournament, now);

  if (periodCheck.status === "not_started") {
    const startDate = tournament.registrationPeriod?.startDate;
    return {
      canApply: false,
      blockReason: "NOT_STARTED",
      message: periodCheck.message || "참가 신청 기간이 시작되지 않았습니다.",
      startDate,
    };
  }

  if (periodCheck.status === "closed" || periodCheck.status === "roster_edit_only") {
    return {
      canApply: false,
      blockReason: "ENDED",
      message: periodCheck.message || "참가 신청 기간이 종료되었습니다.",
    };
  }

  // 🔥 정원 마감 체크 (추후 구현)
  // TODO: tournament.maxTeams와 현재 신청 팀 수 비교
  // if (isFull) {
  //   return {
  //     canApply: false,
  //     blockReason: "FULL",
  //     message: "참가 인원이 마감되었습니다.",
  //   };
  // }

  // 🔥 신청 가능
  if (periodCheck.canApply) {
    return {
      canApply: true,
      blockReason: null,
      message: periodCheck.message || "참가 신청이 가능합니다.",
    };
  }

  // 🔥 기타 (registrationOpen 등)
  if (!tournament.registrationOpen) {
    return {
      canApply: false,
      blockReason: "ENDED",
      message: "참가 신청이 마감되었습니다.",
    };
  }

  // 🔥 기본값: 종료
  return {
    canApply: false,
    blockReason: "ENDED",
    message: "참가 신청이 마감되었습니다.",
  };
}

/**
 * 차단 사유에 따른 사용자 메시지 (UI 표시용)
 */
export function getBlockReasonMessage(
  blockReason: ApplyBlockReason,
  startDate?: Date | string
): string {
  switch (blockReason) {
    case "NOT_STARTED":
      if (startDate) {
        const dateStr = typeof startDate === "string"
          ? startDate
          : kstDateString(startDate);
        const formatted = new Date(dateStr).toLocaleDateString("ko-KR");
        return `참가 신청 기간이 아닙니다 (${formatted}부터 가능)`;
      }
      return "참가 신청 기간이 아닙니다";
    case "ENDED":
      return "참가 신청이 마감되었습니다";
    case "FULL":
      return "참가 인원이 마감되었습니다";
    case "ALREADY_APPLIED":
      return "이미 참가 신청을 완료했습니다";
    case "DRAW_EXECUTED":
      return "조 추첨이 완료되어 신청이 마감되었습니다";
    case "TOURNAMENT_ENDED":
      return "종료된 대회입니다";
    case "TOURNAMENT_ONGOING":
      return "진행 중인 대회입니다";
    default:
      return "참가 신청이 가능합니다";
  }
}
