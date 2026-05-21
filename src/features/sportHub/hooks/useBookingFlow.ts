/**
 * 🔥 useBookingFlow - 예약/결제 플로우 훅
 */

import { useState } from "react";
import type { GroundSlot, Reservation } from "../domain/booking.types";
import { validateBookingFlow } from "../domain/booking.flow";
import { createReservation, requestPayment } from "../data/booking.api";
import { logBookingEvent } from "../domain/booking.kpi";

export function useBookingFlow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBooking = async (
    slot: GroundSlot,
    userId: string,
    pg: "kcp" | "tosspay" | "iamport" = "tosspay",
    metadata?: { source?: "StoryZone" | "ActionGrid"; storyId?: string }
  ): Promise<{
    success: boolean;
    reservation?: Reservation;
    paymentRedirectUrl?: string;
  }> => {
    setLoading(true);
    setError(null);

    try {
      // 1. 검증
      const validation = validateBookingFlow(slot);
      if (!validation.valid) {
        setError(validation.error || "예약 불가능");
        return { success: false };
      }

      // 2. KPI: 예약 시작
      logBookingEvent({
        event: "reservation_start",
        slotId: slot.id,
        groundId: slot.groundId,
        amount: slot.price,
        at: new Date().toISOString(),
        sessionId: getSessionId(),
        userId,
        metadata,
      });

      // 3. 예약 생성
      const reservation = await createReservation({
        slotId: slot.id,
        userId,
      });

      // 4. KPI: 예약 완료
      logBookingEvent({
        event: "reservation_complete",
        slotId: slot.id,
        groundId: slot.groundId,
        reservationId: reservation.id,
        amount: reservation.amount,
        at: new Date().toISOString(),
        sessionId: getSessionId(),
        userId,
        metadata,
      });

      // 5. 결제 요청
      const returnUrl = `${window.location.origin}/ground/booking/complete`;
      const payment = await requestPayment({
        reservationId: reservation.id,
        pg,
        returnUrl,
      });

      // 6. KPI: 결제 시작
      logBookingEvent({
        event: "payment_start",
        reservationId: reservation.id,
        paymentId: payment.paymentId,
        amount: reservation.amount,
        pg,
        at: new Date().toISOString(),
        sessionId: getSessionId(),
        userId,
        metadata,
      });

      return {
        success: true,
        reservation,
        paymentRedirectUrl: payment.redirectUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "예약 실패";
      setError(errorMessage);

      // KPI: 결제 실패
      logBookingEvent({
        event: "payment_failed",
        slotId: slot.id,
        groundId: slot.groundId,
        amount: slot.price,
        at: new Date().toISOString(),
        sessionId: getSessionId(),
        userId,
        metadata: {
          ...metadata,
          error: errorMessage,
        },
      });

      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    startBooking,
    loading,
    error,
  };
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  const key = "booking_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}
