/**
 * 🔥 Settlement Rules - 정산 규칙
 * 
 * 수수료, 취소 정책, 확정 조건
 */

import type { SettlementItem } from "./settlement.types";

/**
 * 수수료율 (기본/프로모/제휴)
 */
export const FEE_RATES = {
  default: 0.1,   // 10%
  promo: 0.08,    // 8%
  partner: 0.06,  // 6%
} as const;

/**
 * 수수료 계산
 */
export function calculateFee(
  amount: number,
  feeRate: number = FEE_RATES.default
): {
  fee: number;
  net: number;
} {
  const fee = Math.round(amount * feeRate);
  const net = amount - fee;
  return { fee, net };
}

/**
 * 취소 정책 (시간 기준)
 */
export const CANCELLATION_POLICY = {
  fullRefund: 24 * 60 * 60 * 1000,  // 24시간 전: 100%
  halfRefund: 6 * 60 * 60 * 1000,   // 6시간 전: 50%
  noRefund: 0,                       // 이후: 0%
} as const;

/**
 * 환불 금액 계산
 */
export function calculateRefund(
  amount: number,
  slotStartTime: string, // ISO string
  cancelledAt: string = new Date().toISOString()
): {
  refundRate: number; // 0.0 ~ 1.0
  refundAmount: number;
} {
  const slotTime = new Date(slotStartTime).getTime();
  const cancelTime = new Date(cancelledAt).getTime();
  const timeDiff = slotTime - cancelTime;

  let refundRate = 0;

  if (timeDiff >= CANCELLATION_POLICY.fullRefund) {
    refundRate = 1.0; // 100%
  } else if (timeDiff >= CANCELLATION_POLICY.halfRefund) {
    refundRate = 0.5; // 50%
  } else {
    refundRate = 0; // 0%
  }

  const refundAmount = Math.round(amount * refundRate);

  return { refundRate, refundAmount };
}

/**
 * 정산 확정 조건 확인
 */
export function canSettle(item: SettlementItem): {
  canSettle: boolean;
  reason?: string;
} {
  // 이미 정산됨
  if (item.status === "SETTLED") {
    return { canSettle: false, reason: "이미 정산 완료" };
  }

  // 취소됨
  if (item.status === "CANCELLED") {
    return { canSettle: false, reason: "취소된 예약" };
  }

  // 홀드 상태
  if (item.status === "HOLD") {
    return { canSettle: false, reason: "분쟁으로 인한 홀드" };
  }

  // 이용일 확인 (경기 종료 후 2시간 경과)
  const usedAt = new Date(item.usedAt).getTime();
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;

  if (now < usedAt + twoHours) {
    return { canSettle: false, reason: "이용 완료 후 2시간 미경과" };
  }

  return { canSettle: true };
}

/**
 * 정산 주기 계산 (주차)
 */
export function getSettlementPeriod(date: Date = new Date()): {
  week: string;
  startDate: string;
  endDate: string;
} {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  
  // 주차 계산 (간단 버전: 월의 첫 주부터)
  const firstDay = new Date(year, date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay();
  const weekStart = new Date(firstDay);
  weekStart.setDate(1 - dayOfWeek); // 주의 시작 (일요일)
  
  const currentWeek = Math.floor((date.getDate() + dayOfWeek - 1) / 7) + 1;
  
  const weekStartDate = new Date(weekStart);
  weekStartDate.setDate(weekStartDate.getDate() + (currentWeek - 1) * 7);
  
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  return {
    week: `${year}-${month}-${currentWeek}w`,
    startDate: weekStartDate.toISOString(),
    endDate: weekEndDate.toISOString(),
  };
}
