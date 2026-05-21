/**
 * 🔥 Partner Settlement - 파트너 정산
 * 
 * 수익 분배, 정산 주기, 취소 반영
 */

import type { Partner, PartnerContract } from "./partner.types";
import { calculateRevenueShare } from "./partner.contract";

/**
 * 파트너 정산 항목
 */
export type PartnerSettlementItem = {
  id: string;
  partnerId: string;
  reservationId: string;
  amount: number;
  partnerFee: number;
  platformFee: number;
  groundRevenue: number;
  status: "pending" | "settled" | "cancelled";
  settledAt?: string;
};

/**
 * 파트너 정산
 */
export type PartnerSettlement = {
  id: string;
  partnerId: string;
  period: string; // "2025-02-1w"
  startDate: string;
  endDate: string;
  items: PartnerSettlementItem[];
  totalAmount: number;
  totalPartnerFee: number;
  totalPlatformFee: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  paidAt?: string;
  createdAt: string;
};

/**
 * 정산 항목 생성
 */
export function createSettlementItem(
  partner: Partner,
  reservationId: string,
  amount: number
): PartnerSettlementItem {
  const breakdown = calculateRevenueShare(amount, partner.contract);

  return {
    id: `partner-settle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    partnerId: partner.id,
    reservationId,
    amount,
    partnerFee: breakdown.partner,
    platformFee: breakdown.platform,
    groundRevenue: breakdown.ground,
    status: "pending",
  };
}

/**
 * 정산 주기 확인
 */
export function shouldSettle(
  partner: Partner,
  lastSettledAt: string
): boolean {
  const lastSettled = new Date(lastSettledAt).getTime();
  const now = Date.now();
  const daysSinceLastSettle = Math.floor(
    (now - lastSettled) / (24 * 60 * 60 * 1000)
  );

  switch (partner.contract.settlementCycle) {
    case "daily":
      return daysSinceLastSettle >= 1;
    case "weekly":
      return daysSinceLastSettle >= 7;
    case "monthly":
      return daysSinceLastSettle >= 30;
    default:
      return false;
  }
}

/**
 * 취소 반영
 */
export function applyCancellation(
  item: PartnerSettlementItem
): PartnerSettlementItem {
  return {
    ...item,
    status: "cancelled",
    partnerFee: 0,
    platformFee: 0,
    groundRevenue: 0,
  };
}

/**
 * 정산 생성
 */
export function createSettlement(
  partnerId: string,
  period: string,
  startDate: string,
  endDate: string,
  items: PartnerSettlementItem[]
): PartnerSettlement {
  const validItems = items.filter((item) => item.status === "pending");
  
  const totalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPartnerFee = validItems.reduce(
    (sum, item) => sum + item.partnerFee,
    0
  );
  const totalPlatformFee = validItems.reduce(
    (sum, item) => sum + item.platformFee,
    0
  );

  return {
    id: `partner-settlement-${partnerId}-${period}`,
    partnerId,
    period,
    startDate,
    endDate,
    items: validItems,
    totalAmount,
    totalPartnerFee,
    totalPlatformFee,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}
