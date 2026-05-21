/**
 * 🔥 Settlement Types - 정산 도메인 모델
 * 
 * 구장 사업자·플랫폼·팀 간 돈 흐름 명확화
 */

import type { Region } from "./region.types";

/**
 * 정산 대상
 */
export type SettlementTarget = {
  groundId: string;
  ownerId: string; // 구장 사업자
  ownerName?: string;
  region: Region; // 지역 멀티 허브
};

/**
 * 정산 항목
 */
export type SettlementItem = {
  reservationId: string;
  amount: number;      // 결제액
  feeRate: number;     // 플랫폼 수수료율 (0.1 = 10%)
  fee: number;         // 플랫폼 수수료
  net: number;         // 정산금 (amount - fee)
  usedAt: string;      // 이용일 (ISO string)
  status: "READY" | "SETTLED" | "HOLD" | "CANCELLED";
  cancelledAt?: string;
  refundAmount?: number;
  disputeReason?: string;
};

/**
 * 정산
 */
export type Settlement = {
  id: string;
  ownerId: string;
  region: Region;     // 지역 멀티 허브
  period: string;      // "2025-02-1w" (주차)
  startDate: string;   // ISO string
  endDate: string;     // ISO string
  total: number;       // 총 정산금
  feeTotal: number;    // 총 수수료
  items: SettlementItem[];
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt?: string;
  createdAt: string;
};

/**
 * 정산 주기
 */
export type SettlementPeriod = {
  week: string;        // "2025-02-1w"
  startDate: string;
  endDate: string;
};
