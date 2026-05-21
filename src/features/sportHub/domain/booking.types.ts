/**
 * 🔥 Booking Types - 구장 예약 도메인 모델
 * 
 * Slot → Reservation → Payment → Ticket
 */

import type { Region } from "./region.types";

/**
 * 구장 슬롯
 */
export type GroundSlot = {
  id: string;
  groundId: string;
  groundName: string;
  start: string; // ISO string
  end: string;   // ISO string
  price: number;
  status: "OPEN" | "LOCKED" | "BOOKED";
  lockedUntil?: string; // ISO string (락 만료 시간)
};

/**
 * 예약
 */
export type Reservation = {
  id: string;
  slotId: string;
  groundId: string;
  userId: string;
  amount: number;
  status: "READY" | "PAID" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  expiresAt: string; // 5분 후 만료
};

/**
 * 결제
 */
export type Payment = {
  id: string;
  reservationId: string;
  amount: number;
  pg: "kcp" | "tosspay" | "iamport";
  status: "REQUEST" | "APPROVED" | "FAILED" | "CANCELLED";
  pgTransactionId?: string;
  approvedAt?: string;
  failedReason?: string;
};

/**
 * 구장 정보
 */
export type Ground = {
  id: string;
  region: Region; // 지역 멀티 허브
  name: string;
  address: string;
  capacity?: number;
  facilities?: string[];
  images?: string[];
};
