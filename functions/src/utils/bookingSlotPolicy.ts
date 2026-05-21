/**
 * 🔥 대관 슬롯 우선권 정책 (노원 실전)
 * 
 * 규칙:
 * - 회원 팀: D-7일부터 예약 가능
 * - 비회원 팀: D-3일부터 예약 가능
 * - 슬롯 기반 관리 (date × timeRange × facilityId)
 * - 동시성: 트랜잭션으로 해결
 */

import { TeamStatus } from "../types/policy";

/**
 * 슬롯 예약 가능 여부 확인
 * 
 * @param teamStatus - 팀 상태 (MEMBER/NON_MEMBER/ACADEMY)
 * @param targetDate - 예약하려는 날짜
 * @param today - 오늘 날짜 (기본값: new Date())
 * @returns { canBook: boolean; openDate: Date; message: string }
 */
export function checkSlotBookingPolicy(
  teamStatus: TeamStatus,
  targetDate: Date,
  today: Date = new Date()
): {
  canBook: boolean;
  openDate: Date;
  message: string;
} {
  // 날짜 차이 계산 (일수)
  const diffDays = Math.floor(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 회원 팀: D-7일부터 예약 가능
  if (teamStatus === TeamStatus.MEMBER) {
    const openDate = new Date(today);
    openDate.setDate(openDate.getDate() + 7); // D-7

    if (diffDays >= 7) {
      return {
        canBook: true,
        openDate,
        message: "우선 배정 대상입니다 (D-7부터 예약 가능)",
      };
    } else {
      return {
        canBook: false,
        openDate,
        message: `회원 팀은 D-7일부터 예약 가능합니다. (예약 가능일: ${openDate.toLocaleDateString("ko-KR")})`,
      };
    }
  }

  // 비회원 팀: D-3일부터 예약 가능
  if (teamStatus === TeamStatus.NON_MEMBER) {
    const openDate = new Date(today);
    openDate.setDate(openDate.getDate() + 3); // D-3

    if (diffDays >= 3) {
      return {
        canBook: true,
        openDate,
        message: "잔여 시간대 이용 가능 (D-3부터 예약 가능)",
      };
    } else {
      return {
        canBook: false,
        openDate,
        message: `비회원 팀은 D-3일부터 예약 가능합니다. (예약 가능일: ${openDate.toLocaleDateString("ko-KR")})`,
      };
    }
  }

  // 아카데미: 협회 선대관 일정 내 배정 (별도 처리)
  if (teamStatus === TeamStatus.ACADEMY) {
    const openDate = new Date(today);
    openDate.setDate(openDate.getDate() + 7); // 회원과 동일 (임시)

    return {
      canBook: false,
      openDate,
      message: "협회 선대관 일정 내 배정됩니다",
    };
  }

  // 기본값: 비회원과 동일
  const openDate = new Date(today);
  openDate.setDate(openDate.getDate() + 3);

  return {
    canBook: false,
    openDate,
    message: "잔여 시간대 이용 가능",
  };
}

/**
 * 슬롯 가시성 확인 (UI용)
 * 
 * @param teamStatus - 팀 상태
 * @param targetDate - 예약하려는 날짜
 * @param today - 오늘 날짜
 * @returns { visible: boolean; locked: boolean; unlockDate: Date }
 */
export function getSlotVisibility(
  teamStatus: TeamStatus,
  targetDate: Date,
  today: Date = new Date()
): {
  visible: boolean;
  locked: boolean;
  unlockDate: Date;
} {
  const diffDays = Math.floor(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 회원 팀: D-7부터 표시 (항상 잠김 없음)
  if (teamStatus === TeamStatus.MEMBER) {
    const unlockDate = new Date(today);
    unlockDate.setDate(unlockDate.getDate() + 7);

    return {
      visible: diffDays >= 7,
      locked: false,
      unlockDate,
    };
  }

  // 비회원 팀: D-3부터 표시, D-7~D-4는 잠김
  if (teamStatus === TeamStatus.NON_MEMBER) {
    const unlockDate = new Date(today);
    unlockDate.setDate(unlockDate.getDate() + 3);

    if (diffDays < 3) {
      return {
        visible: false,
        locked: true,
        unlockDate,
      };
    } else if (diffDays >= 3 && diffDays < 7) {
      return {
        visible: true,
        locked: true, // D-3~D-7: 보이지만 잠김 (회원 우선 기간)
        unlockDate,
      };
    } else {
      return {
        visible: true,
        locked: false, // D-7 이후: 선택 가능
        unlockDate,
      };
    }
  }

  // 기본값
  const unlockDate = new Date(today);
  unlockDate.setDate(unlockDate.getDate() + 3);

  return {
    visible: diffDays >= 3,
    locked: diffDays < 7,
    unlockDate,
  };
}

/**
 * 슬롯 ID 생성 (고유 식별자)
 * 
 * @param facilityId - 시설 ID
 * @param date - 날짜 (YYYY-MM-DD)
 * @param timeRange - 시간대 (예: "18:00-20:00")
 * @returns 슬롯 ID
 */
export function generateSlotId(
  facilityId: string,
  date: string,
  timeRange: string
): string {
  return `${facilityId}_${date}_${timeRange}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

