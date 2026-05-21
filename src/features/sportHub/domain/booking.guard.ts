/**
 * 🔥 Booking Guard - 예약/결제 안전장치
 * 
 * 중복 방지, 타임아웃, 재고 락
 */

import type { GroundSlot, Reservation } from "./booking.types";

/**
 * 슬롯 락 시간 (5분)
 */
const LOCK_DURATION = 5 * 60 * 1000; // 5분

/**
 * 예약 만료 시간 (5분)
 */
const RESERVATION_EXPIRY = 5 * 60 * 1000; // 5분

/**
 * 슬롯 락 가능 여부 확인
 */
export function canLockSlot(slot: GroundSlot): {
  canLock: boolean;
  reason?: string;
} {
  // 이미 예약됨
  if (slot.status === "BOOKED") {
    return { canLock: false, reason: "이미 예약된 슬롯" };
  }

  // 락 확인
  if (slot.status === "LOCKED" && slot.lockedUntil) {
    const now = Date.now();
    const lockedUntil = new Date(slot.lockedUntil).getTime();
    
    if (now < lockedUntil) {
      return { canLock: false, reason: "다른 사용자가 예약 중" };
    }
  }

  return { canLock: true };
}

/**
 * 슬롯 락 생성
 */
export function createSlotLock(slot: GroundSlot): GroundSlot {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION);

  return {
    ...slot,
    status: "LOCKED",
    lockedUntil: lockedUntil.toISOString(),
  };
}

/**
 * 예약 만료 확인
 */
export function isReservationExpired(reservation: Reservation): boolean {
  const now = Date.now();
  const expiresAt = new Date(reservation.expiresAt).getTime();
  return now > expiresAt;
}

/**
 * 예약 만료 시간 생성
 */
export function createReservationExpiry(): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_EXPIRY);
  return expiresAt.toISOString();
}

/**
 * 중복 결제 방지 (예약 ID 기준)
 */
export function checkDoublePayment(
  reservationId: string,
  existingPayments: Array<{ reservationId: string; status: string }>
): {
  allowed: boolean;
  reason?: string;
} {
  // 이미 승인된 결제가 있으면 차단
  const approved = existingPayments.find(
    (p) => p.reservationId === reservationId && p.status === "APPROVED"
  );

  if (approved) {
    return { allowed: false, reason: "이미 결제 완료된 예약" };
  }

  return { allowed: true };
}
