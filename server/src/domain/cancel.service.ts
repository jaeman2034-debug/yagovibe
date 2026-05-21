/**
 * 🔥 Cancel Service - 취소 서비스
 * 
 * Week3 핵심: 취소/부분환불 + 정산 보정
 */

import { prisma } from "../data/prisma";
import { calcRefundRate, calcRefundAmount } from "./refund.policy";
import { cancelPay } from "./pg.adapter";

const FEE_RATE = 0.07; // 플랫폼 수수료 7%

/**
 * 예약 취소 (환불 + 정산 보정)
 */
export async function cancelReservation(
  reservationId: string,
  reason?: string
): Promise<{
  reservationId: string;
  refundAmount: number;
  rate: number;
  settlementAdjusted: boolean;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error("reservation_not_found");
  }

  if (reservation.status !== "PAID") {
    throw new Error("reservation_not_paid");
  }

  // 슬롯 정보 조회
  const slot = await prisma.slot.findUnique({
    where: { id: reservation.slotId },
  });

  if (!slot) {
    throw new Error("slot_not_found");
  }

  // 환불율 계산
  const rate = calcRefundRate(slot.startAt);
  const refundAmount = calcRefundAmount(reservation.amount, slot.startAt);

  // Payment 조회
  const payment = await prisma.payment.findFirst({
    where: {
      reservationId,
      status: "APPROVED",
    },
    orderBy: { createdAt: "desc" },
  });

  // PG 취소 요청 (환불 금액이 있는 경우)
  if (refundAmount > 0 && payment?.pgTid) {
    const cancelResult = await cancelPay(payment.pgTid, refundAmount, reason);

    if (!cancelResult.ok) {
      throw new Error(`payment_cancel_failed: ${cancelResult.reason}`);
    }

    // Payment 상태 업데이트
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" },
    });
  }

  // 1) 예약 상태 변경
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCEL" },
  });

  // 2) 슬롯 OPEN 복구
  await prisma.slot.update({
    where: { id: reservation.slotId },
    data: { status: "OPEN" },
  });

  // 3) 정산 보정
  let settlementAdjusted = false;
  const settlementItem = await prisma.settlementItem.findFirst({
    where: { reservationId },
  });

  if (settlementItem) {
    if (rate === 0) {
      // 환불 없음 → 정산 아이템 HOLD
      await prisma.settlementItem.update({
        where: { id: settlementItem.id },
        data: { status: "HOLD" },
      });
      settlementAdjusted = true;
    } else {
      // 부분 환불 → 정산 아이템 금액 보정
      const newNet = Math.floor(refundAmount * (1 - FEE_RATE));
      const newFee = refundAmount - newNet;

      await prisma.settlementItem.update({
        where: { id: settlementItem.id },
        data: {
          amount: refundAmount,
          net: newNet,
          status: "READY", // 보정된 금액으로 정산 가능
        },
      });
      settlementAdjusted = true;

      console.log(
        `[SETTLEMENT_ADJUSTED] Reservation ${reservationId}: ${settlementItem.amount}원 → ${refundAmount}원 (net: ${settlementItem.net}원 → ${newNet}원)`
      );
    }
  }

  // 4) 로그 (KPI)
  await prisma.eventLog.create({
    data: {
      eventName: "payment_cancel",
      payload: JSON.stringify({
        reservationId,
        originalAmount: reservation.amount,
        refundAmount,
        rate,
        reason: reason || "user_request",
      }),
      userId: reservation.userId,
    },
  });

  console.log(
    `[CANCEL] Reservation ${reservationId}: ${reservation.amount}원 → ${refundAmount}원 환불 (${(rate * 100).toFixed(0)}%)`
  );

  return {
    reservationId,
    refundAmount,
    rate,
    settlementAdjusted,
  };
}

/**
 * 취소 가능 여부 체크
 */
export async function canCancelReservation(
  reservationId: string
): Promise<{
  canCancel: boolean;
  refundRate: number;
  refundAmount: number;
  reason?: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    return {
      canCancel: false,
      refundRate: 0,
      refundAmount: 0,
      reason: "reservation_not_found",
    };
  }

  if (reservation.status !== "PAID") {
    return {
      canCancel: false,
      refundRate: 0,
      refundAmount: 0,
      reason: "reservation_not_paid",
    };
  }

  const slot = await prisma.slot.findUnique({
    where: { id: reservation.slotId },
  });

  if (!slot) {
    return {
      canCancel: false,
      refundRate: 0,
      refundAmount: 0,
      reason: "slot_not_found",
    };
  }

  const rate = calcRefundRate(slot.startAt);
  const refundAmount = calcRefundAmount(reservation.amount, slot.startAt);

  return {
    canCancel: true,
    refundRate: rate,
    refundAmount,
  };
}
