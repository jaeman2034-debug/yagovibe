/**
 * 🔥 Settlement Dispute - 분쟁 처리
 * 
 * 노쇼 분쟁, 중복 결제, 환불 웹훅 보정
 */

import type { SettlementItem } from "./settlement.types";

/**
 * 분쟁 타입
 */
export type DisputeType = "no_show" | "double_payment" | "refund_issue" | "other";

/**
 * 분쟁 처리
 */
export type Dispute = {
  id: string;
  reservationId: string;
  type: DisputeType;
  reason: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  createdAt: string;
  resolvedAt?: string;
};

/**
 * 노쇼 확인
 */
export function checkNoShow(
  reservationId: string,
  slotStartTime: string,
  checkInTime?: string
): {
  isNoShow: boolean;
  reason?: string;
} {
  const slotTime = new Date(slotStartTime).getTime();
  const now = Date.now();
  const oneHourAfter = slotTime + 60 * 60 * 1000; // 1시간 후

  // 슬롯 시작 후 1시간이 지났는데 체크인 없으면 노쇼
  if (!checkInTime && now > oneHourAfter) {
    return {
      isNoShow: true,
      reason: "체크인 없음 (1시간 경과)",
    };
  }

  return { isNoShow: false };
}

/**
 * 정산 항목 홀드 (분쟁)
 */
export function holdSettlementItem(
  item: SettlementItem,
  disputeType: DisputeType,
  reason: string
): SettlementItem {
  return {
    ...item,
    status: "HOLD",
    disputeReason: `${disputeType}: ${reason}`,
  };
}

/**
 * 중복 결제 확인
 */
export function checkDoublePayment(
  reservationId: string,
  payments: Array<{ reservationId: string; status: string; amount: number }>
): {
  hasDouble: boolean;
  duplicatePayments?: Array<{ id: string; amount: number }>;
} {
  const approved = payments.filter(
    (p) => p.reservationId === reservationId && p.status === "APPROVED"
  );

  if (approved.length > 1) {
    return {
      hasDouble: true,
      duplicatePayments: approved.map((p) => ({
        id: p.reservationId,
        amount: p.amount,
      })),
    };
  }

  return { hasDouble: false };
}
