/**
 * 🔥 Reserve Service - 예약 락 + 중복결제 방지
 * 
 * Week3 핵심: 5분 락 + 중복결제 가드
 */

import { prisma } from "../data/prisma";

const LOCK_MINUTES = 5;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

/**
 * 슬롯 락 (5분)
 */
export async function lockSlot(slotId: string): Promise<void> {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    throw new Error("slot_not_found");
  }

  if (slot.status !== "OPEN") {
    throw new Error("not_available");
  }

  // 5분 LOCK
  await prisma.slot.update({
    where: { id: slotId },
    data: { status: "LOCKED" },
  });

  // 타이머 해제 (간이 구현 - 실제 운영 시 Redis/Queue 사용 권장)
  setTimeout(async () => {
    try {
      const s = await prisma.slot.findUnique({ where: { id: slotId } });
      if (s?.status === "LOCKED") {
        await prisma.slot.update({
          where: { id: slotId },
          data: { status: "OPEN" },
        });
        console.log(`[LOCK_EXPIRED] Slot ${slotId} unlocked`);
      }
    } catch (error) {
      console.error(`[LOCK_EXPIRED] Error unlocking slot ${slotId}:`, error);
    }
  }, LOCK_MS);

  console.log(`[LOCK] Slot ${slotId} locked for ${LOCK_MINUTES} minutes`);
}

/**
 * 중복결제 체크
 */
export async function checkDoublePayment(
  reservationId: string
): Promise<void> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!r) {
    throw new Error("reservation_not_found");
  }

  if (r.status === "PAID") {
    throw new Error("already_paid");
  }

  if (r.status === "CANCEL") {
    throw new Error("reservation_cancelled");
  }
}

/**
 * 예약 만료 체크 (READY 상태가 너무 오래 지속)
 */
export async function checkReservationExpiry(
  reservationId: string
): Promise<boolean> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!r || r.status !== "READY") {
    return false;
  }

  const age = Date.now() - r.createdAt.getTime();
  const expired = age > LOCK_MS;

  if (expired) {
    // 예약 취소 및 슬롯 해제
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCEL" },
    });

    await prisma.slot.update({
      where: { id: r.slotId },
      data: { status: "OPEN" },
    });

    console.log(`[RESERVATION_EXPIRED] Reservation ${reservationId} cancelled`);
    return true;
  }

  return false;
}

/**
 * 슬롯 사용 가능 여부 체크
 */
export async function isSlotAvailable(slotId: string): Promise<boolean> {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return false;
  }

  return slot.status === "OPEN";
}
