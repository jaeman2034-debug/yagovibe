/**
 * 💳 결제 관련 타입 정의 (v2)
 */

import type { Timestamp } from "firebase/firestore";

/**
 * 결제 상태
 */
export type PaymentStatus = "ready" | "paid" | "failed" | "cancelled";

/**
 * 결제 방법
 */
export type PaymentMethod = "card" | "transfer" | "virtual_account" | null;

/**
 * 결제 정보
 * 경로: associations/{associationId}/tournaments/{tournamentId}/payments/{applicationId}
 */
export interface Payment {
  id: string; // applicationId와 동일 (1:1 관계)
  applicationId: string;
  associationId: string;
  competitionId: string;
  teamName: string;
  
  // 🔥 결제 금액 (서버 계산값만 사용)
  amount: number;
  
  // 결제 상태
  status: PaymentStatus;
  
  // 결제 방법
  method: PaymentMethod;
  
  // 토스페이먼츠 관련
  paymentKey?: string | null; // 토스페이먼츠 결제 키
  orderId: string; // 주문 ID (예: "app_{applicationId}")
  
  // 영수증
  receiptUrl?: string | null;
  
  // 타임스탬프
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp | null;
}
