/**
 * 🔥 Pay Service - 결제 서비스
 * 
 * Week3 핵심: 결제 요청/승인 + 정산 아이템 생성
 */

import { prisma } from "../data/prisma";
import { requestPay, approvePay, cancelPay } from "./pg.adapter";
import { checkDoublePayment } from "./reserve.service";

const FEE_RATE = 0.07; // 플랫폼 수수료 7%

/**
 * 결제 요청 시작
 */
export async function startPayment(
  reservationId: string,
  pg: string = "mock"
): Promise<{
  paymentId: string;
  pgTid: string | null;
  status: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error("reservation_not_found");
  }

  if (reservation.status !== "READY") {
    throw new Error("reservation_not_ready");
  }

  // PG 결제 요청
  const pgResult = await requestPay({
    reservationId,
    amount: reservation.amount,
    userId: reservation.userId,
  });

  // Payment 레코드 생성
  const payment = await prisma.payment.create({
    data: {
      id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      reservationId,
      pg,
      status: pgResult.ok ? "REQUEST" : "FAILED",
      amount: reservation.amount,
      pgTid: pgResult.ok ? pgResult.pgTid : null,
    },
  });

  // 결제 실패 시 로그
  if (!pgResult.ok) {
    await prisma.eventLog.create({
      data: {
        eventName: "payment_fail",
        payload: JSON.stringify({
          reservationId,
          paymentId: payment.id,
          reason: pgResult.reason,
        }),
        userId: reservation.userId,
      },
    });
  }

  return {
    paymentId: payment.id,
    pgTid: payment.pgTid,
    status: payment.status,
  };
}

/**
 * 결제 승인 (웹훅)
 */
export async function approvePayment(
  reservationId: string,
  pgTid?: string
): Promise<{
  reservationId: string;
  paymentId: string;
  settlementItemId: string;
}> {
  // 중복결제 체크
  await checkDoublePayment(reservationId);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error("reservation_not_found");
  }

  // Payment 조회
  const payment = await prisma.payment.findFirst({
    where: {
      reservationId,
      status: "REQUEST",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    throw new Error("payment_not_found");
  }

  // PG 승인 (실제 구현 시)
  if (pgTid) {
    const approveResult = await approvePay(pgTid, payment.amount);
    if (!approveResult.ok) {
      throw new Error(`payment_approval_failed: ${approveResult.reason}`);
    }
  }

  // Payment 상태 업데이트
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "APPROVED" },
  });

  // Reservation 상태 업데이트
  const updatedReservation = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "PAID" },
  });

  // Slot 상태 업데이트
  await prisma.slot.update({
    where: { id: reservation.slotId },
    data: { status: "BOOKED" },
  });

  // 정산 아이템 생성
  const net = Math.floor(reservation.amount * (1 - FEE_RATE));
  const fee = reservation.amount - net;

  // 실제 구현: 구장 소유자 ID 조회
  const slot = await prisma.slot.findUnique({
    where: { id: reservation.slotId },
  });
  const ground = slot
    ? await prisma.ground.findUnique({
        where: { id: slot.groundId },
      })
    : null;

  const ownerId = ground?.id || "ground_owner_1"; // 임시
  const region = ground?.region || "seoul";

  const settlementItem = await prisma.settlementItem.create({
    data: {
      id: `si_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      reservationId: reservation.id,
      ownerId,
      region,
      amount: reservation.amount,
      feeRate: FEE_RATE,
      net,
      status: "READY",
      usedAt: new Date(),
    },
  });

  // KPI 로그
  await prisma.eventLog.create({
    data: {
      eventName: "payment_success",
      payload: JSON.stringify({
        reservationId,
        paymentId: payment.id,
        amount: reservation.amount,
        metadata: {
          amount: reservation.amount,
        },
      }),
      userId: reservation.userId,
      region,
    },
  });

  console.log(
    `[PAYMENT_APPROVED] Reservation ${reservationId}: ${reservation.amount}원, Settlement: ${net}원 (fee: ${fee}원)`
  );

  return {
    reservationId: reservation.id,
    paymentId: payment.id,
    settlementItemId: settlementItem.id,
  };
}

/**
 * 결제 취소
 */
export async function cancelPayment(
  reservationId: string,
  reason?: string
): Promise<{
  paymentId: string;
  cancelled: boolean;
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

  const payment = await prisma.payment.findFirst({
    where: {
      reservationId,
      status: "APPROVED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment || !payment.pgTid) {
    throw new Error("payment_not_found");
  }

  // PG 취소 요청
  const cancelResult = await cancelPay(payment.pgTid, payment.amount, reason);

  if (!cancelResult.ok) {
    throw new Error(`payment_cancel_failed: ${cancelResult.reason}`);
  }

  // Payment 상태 업데이트
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "CANCELLED" },
  });

  // Reservation 상태 업데이트
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "CANCEL" },
  });

  // Slot 상태 업데이트
  await prisma.slot.update({
    where: { id: reservation.slotId },
    data: { status: "OPEN" },
  });

  // SettlementItem 상태 업데이트 (HOLD)
  await prisma.settlementItem.updateMany({
    where: { reservationId },
    data: { status: "HOLD" },
  });

  return {
    paymentId: payment.id,
    cancelled: true,
  };
}
