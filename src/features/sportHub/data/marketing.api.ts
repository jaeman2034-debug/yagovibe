/**
 * 🔥 Marketing API - 마케팅 자동화 API 클라이언트
 */

import type { Campaign, CampaignSendLog } from "../domain/marketing.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 캠페인 목록 조회
 */
export async function getCampaigns(params?: {
  region?: string;
  trigger?: string;
  enabled?: boolean;
}): Promise<Campaign[]> {
  const query = new URLSearchParams();
  if (params?.region) query.set("region", params.region);
  if (params?.trigger) query.set("trigger", params.trigger);
  if (params?.enabled !== undefined) query.set("enabled", String(params.enabled));

  const res = await fetch(`${API_BASE}/marketing/campaigns?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`캠페인 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 캠페인 생성
 */
export async function createCampaign(
  campaign: Omit<Campaign, "id" | "createdAt" | "updatedAt">
): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/marketing/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campaign),
  });

  if (!res.ok) {
    throw new Error(`캠페인 생성 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 캠페인 발송 로그 조회
 */
export async function getCampaignLogs(params?: {
  campaignId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CampaignSendLog[]> {
  const query = new URLSearchParams();
  if (params?.campaignId) query.set("campaignId", params.campaignId);
  if (params?.userId) query.set("userId", params.userId);
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);

  const res = await fetch(`${API_BASE}/marketing/logs?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`캠페인 로그 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 푸시 알림 발송
 */
export async function sendPushNotification(
  userId: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const res = await fetch(`${API_BASE}/marketing/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message, metadata }),
  });

  if (!res.ok) {
    throw new Error(`푸시 알림 발송 실패: ${res.status}`);
  }
}

/**
 * 카카오톡 발송
 */
export async function sendKakaoMessage(
  userId: string,
  message: string,
  templateId?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/marketing/kakao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message, templateId }),
  });

  if (!res.ok) {
    throw new Error(`카카오톡 발송 실패: ${res.status}`);
  }
}
