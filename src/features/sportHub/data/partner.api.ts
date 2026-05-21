/**
 * 🔥 Partner API - 파트너 제휴 API 클라이언트
 * 
 * 지도 → 허브, PG 웹훅
 */

import type { PartnerRequest, PartnerResponse } from "../domain/partner.types";
import { generateHMACSignature } from "../domain/partner.security";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 파트너 요청 생성 (비동기)
 */
export async function createPartnerRequest(
  partnerId: string,
  payload: Record<string, any>,
  apiSecret: string
): Promise<PartnerRequest> {
  const timestamp = new Date().toISOString();
  const signature = await generateHMACSignature(payload, apiSecret, timestamp);

  return {
    partnerId,
    timestamp,
    signature,
    payload,
  };
}

/**
 * 지도 → 허브: 구장 정보 조회
 */
export async function getGroundFromPartner(
  groundId: string,
  partnerId: string
): Promise<any> {
  const request = await createPartnerRequest(
    partnerId,
    { groundId },
    "" // 실제로는 파트너별 secret 사용
  );

  const res = await fetch(`${API_BASE}/partner/ground/${groundId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Partner-Id": partnerId,
      "X-Partner-Signature": request.signature,
      "X-Partner-Timestamp": request.timestamp,
    },
  });

  if (!res.ok) {
    throw new Error(`구장 정보 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 지도 → 허브: 예약 생성
 */
export async function createReservationFromPartner(
  reservationData: {
    groundId: string;
    slotId: string;
    userId: string;
    amount: number;
  },
  partnerId: string
): Promise<any> {
  const request = await createPartnerRequest(
    partnerId,
    reservationData,
    "" // 실제로는 파트너별 secret 사용
  );

  const res = await fetch(`${API_BASE}/partner/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Partner-Id": partnerId,
      "X-Partner-Signature": request.signature,
      "X-Partner-Timestamp": request.timestamp,
    },
    body: JSON.stringify(reservationData),
  });

  if (!res.ok) {
    throw new Error(`예약 생성 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * PG 웹훅 처리
 */
export async function processPaymentWebhook(
  webhookData: {
    transactionId: string;
    amount: number;
    status: "success" | "fail";
    metadata?: Record<string, any>;
  },
  partnerId: string,
  signature: string
): Promise<PartnerResponse> {
  const res = await fetch(`${API_BASE}/webhook/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Partner-Id": partnerId,
      "X-Partner-Signature": signature,
    },
    body: JSON.stringify(webhookData),
  });

  if (!res.ok) {
    throw new Error(`웹훅 처리 실패: ${res.status}`);
  }

  return res.json();
}
