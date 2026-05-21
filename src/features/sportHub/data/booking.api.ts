/**
 * 🔥 Booking API - 구장 예약/결제 API 클라이언트
 */

import type { GroundSlot, Reservation, Payment, Ground } from "../domain/booking.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 구장 목록 조회
 */
export async function getGrounds(params?: {
  region?: string;
  sportType?: string;
}): Promise<Ground[]> {
  const query = new URLSearchParams();
  if (params?.region) query.set("region", params.region);
  if (params?.sportType) query.set("sportType", params.sportType);

  const res = await fetch(`${API_BASE}/grounds?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`구장 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 구장 슬롯 조회
 */
export async function getGroundSlots(
  groundId: string,
  date: string // YYYY-MM-DD
): Promise<GroundSlot[]> {
  const res = await fetch(`${API_BASE}/grounds/${groundId}/slots?date=${date}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`슬롯 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 예약 생성
 */
export async function createReservation(data: {
  slotId: string;
  userId: string;
}): Promise<Reservation> {
  const res = await fetch(`${API_BASE}/ground/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "예약 실패" }));
    throw new Error(error.message || "예약 실패");
  }

  return res.json();
}

/**
 * 결제 요청
 */
export async function requestPayment(data: {
  reservationId: string;
  pg: "kcp" | "tosspay" | "iamport";
  returnUrl: string;
}): Promise<{
  paymentId: string;
  redirectUrl: string;
}> {
  const res = await fetch(`${API_BASE}/pay/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`결제 요청 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 결제 상태 확인
 */
export async function getPaymentStatus(paymentId: string): Promise<Payment> {
  const res = await fetch(`${API_BASE}/pay/${paymentId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`결제 상태 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 예약 취소
 */
export async function cancelReservation(reservationId: string): Promise<{
  success: boolean;
  refundAmount?: number;
}> {
  const res = await fetch(`${API_BASE}/ground/reserve/${reservationId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`예약 취소 실패: ${res.status}`);
  }

  return res.json();
}
