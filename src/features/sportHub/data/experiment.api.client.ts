/**
 * 🔥 Experiment API Client - AB 테스트 API 클라이언트
 */

import type {
  ExpLogRequest,
  ExpLogResponse,
  ExpLogBulkRequest,
  ExpLogBulkResponse,
  ExpAnalyticsRequest,
  ExpAnalyticsResponse,
} from "../domain/experiment.api.contract";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 실험 로그 전송 (단일)
 */
export async function sendExperimentLog(log: ExpLogRequest): Promise<ExpLogResponse> {
  const res = await fetch(`${API_BASE}/exp/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });

  if (!res.ok) {
    throw new Error(`실험 로그 전송 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 실험 로그 일괄 전송
 */
export async function sendExperimentLogsBulk(
  logs: ExpLogRequest[]
): Promise<ExpLogBulkResponse> {
  const res = await fetch(`${API_BASE}/exp/log/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs }),
  });

  if (!res.ok) {
    throw new Error(`실험 로그 일괄 전송 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 실험 집계 조회
 */
export async function getExperimentAnalytics(
  params: ExpAnalyticsRequest
): Promise<ExpAnalyticsResponse> {
  const query = new URLSearchParams();
  query.set("experimentKey", params.experimentKey);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy.join(","));

  const res = await fetch(`${API_BASE}/exp/analytics?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`실험 집계 조회 실패: ${res.status}`);
  }

  return res.json();
}
