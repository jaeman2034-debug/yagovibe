/**
 * 🔥 Booking Flow - 예약/결제 플로우
 * 
 * Slot → Reservation → Payment → Ticket
 */

import type { GroundSlot, Reservation, Payment } from "./booking.types";
import { canLockSlot, createSlotLock, createReservationExpiry } from "./booking.guard";

/**
 * 예약 플로우 결과
 */
export type BookingFlowResult = {
  success: boolean;
  reservation?: Reservation;
  paymentRedirectUrl?: string;
  error?: string;
};

/**
 * 예약 → 결제 플로우 (API 클라이언트 주입)
 * 
 * Note: 실제 API 호출은 컴포넌트/훅에서 처리
 * 이 함수는 검증 로직만 제공
 */
export function validateBookingFlow(slot: GroundSlot): {
  valid: boolean;
  error?: string;
} {
  // 슬롯 락 확인
  const lockCheck = canLockSlot(slot);
  if (!lockCheck.canLock) {
    return {
      valid: false,
      error: lockCheck.reason || "예약 불가능한 슬롯",
    };
  }

  return { valid: true };
}

/**
 * 예약 만료 확인 및 정리
 */
export function checkExpiredReservations(
  reservations: Reservation[]
): Reservation[] {
  const now = Date.now();
  return reservations.filter((r) => {
    if (r.status !== "READY") return true; // 이미 처리된 예약은 유지
    const expiresAt = new Date(r.expiresAt).getTime();
    return now <= expiresAt; // 만료되지 않은 것만
  });
}
