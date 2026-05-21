/**
 * 🔥 Settlement API - 정산 API 클라이언트
 */

import type { Settlement, SettlementItem, SettlementPeriod } from "../domain/settlement.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 정산 목록 조회 (사업자용)
 */
export async function getSettlements(params?: {
  ownerId?: string;
  period?: string;
  status?: Settlement["status"];
}): Promise<Settlement[]> {
  const query = new URLSearchParams();
  if (params?.ownerId) query.set("ownerId", params.ownerId);
  if (params?.period) query.set("period", params.period);
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${API_BASE}/settlement?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 정산 상세 조회
 */
export async function getSettlement(id: string): Promise<Settlement> {
  const res = await fetch(`${API_BASE}/settlement/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 상세 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 정산 항목 조회
 */
export async function getSettlementItems(params?: {
  ownerId?: string;
  status?: SettlementItem["status"];
  period?: string;
}): Promise<SettlementItem[]> {
  const query = new URLSearchParams();
  if (params?.ownerId) query.set("ownerId", params.ownerId);
  if (params?.status) query.set("status", params.status);
  if (params?.period) query.set("period", params.period);

  const res = await fetch(`${API_BASE}/settlement/items?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 항목 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 정산 승인 (관리자)
 */
export async function approveSettlement(id: string): Promise<Settlement> {
  const res = await fetch(`${API_BASE}/settlement/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 승인 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 정산 지급 완료
 */
export async function markSettlementPaid(id: string): Promise<Settlement> {
  const res = await fetch(`${API_BASE}/settlement/${id}/paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 지급 완료 처리 실패: ${res.status}`);
  }

  return res.json();
}
