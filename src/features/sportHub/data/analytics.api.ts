/**
 * 🔥 Analytics API - 데이터 분석 레이어 API 클라이언트
 * 
 * 운영 대시보드 v2가 "자동으로 숫자 채워짐"
 */

import type {
  DailyKpi,
  FunnelAnalysis,
  CompleteEvent,
} from "../domain/analytics.types";
import type { Region } from "../domain/region.types";
import type { HealthScore } from "../domain/analytics.health";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 이벤트 전송
 */
export async function sendEvent(event: CompleteEvent): Promise<void> {
  try {
    // 오프라인 큐에 저장 (이미 구현된 offline.storage 활용)
    const queue = JSON.parse(localStorage.getItem("analytics_queue") || "[]");
    queue.push(event);
    localStorage.setItem("analytics_queue", JSON.stringify(queue));

    // 온라인 시 즉시 전송
    if (navigator.onLine) {
      await flushEventQueue();
    }
  } catch (error) {
    console.warn("[Analytics] 이벤트 저장 실패:", error);
  }
}

/**
 * 이벤트 큐 플러시
 */
export async function flushEventQueue(): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem("analytics_queue") || "[]");
    if (queue.length === 0) return;

    // 🔥 백엔드 라우트: /api/logs/analytics/events
    const res = await fetch(`${API_BASE}/logs/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue }),
    });

    if (res.ok) {
      localStorage.removeItem("analytics_queue");
    }
  } catch (error) {
    console.warn("[Analytics] 이벤트 전송 실패:", error);
  }
}

/**
 * Daily KPI 조회 (확정 스펙)
 */
export async function getDailyKpi(
  date: string,
  region?: Region
): Promise<DailyKpi> {
  const query = new URLSearchParams();
  query.set("date", date);
  if (region) query.set("region", region);

  const res = await fetch(`${API_BASE}/admin/dashboard/kpi?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Daily KPI 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 대시보드 요약 조회 (확정 스펙)
 */
export async function getDashboardSummary(
  date: string,
  region?: Region
): Promise<DailyKpi> {
  const query = new URLSearchParams();
  query.set("date", date);
  if (region) query.set("region", region);

  const res = await fetch(`${API_BASE}/admin/dashboard/summary?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`대시보드 요약 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 허브 건강도 조회
 */
export async function getHealthScore(
  region?: Region,
  date?: string
): Promise<HealthScore> {
  const query = new URLSearchParams();
  if (region) query.set("region", region);
  if (date) query.set("date", date);

  const res = await fetch(`${API_BASE}/admin/dashboard/health?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`허브 건강도 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * Funnel 분석 조회
 */
export async function getFunnelAnalysis(
  region: Region,
  date: string
): Promise<FunnelAnalysis> {
  const query = new URLSearchParams();
  query.set("region", region);
  query.set("date", date);

  const res = await fetch(`${API_BASE}/admin/dashboard/funnel?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Funnel 분석 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 지역별 Daily KPI 조회
 */
export async function getDailyKpiByRegions(
  date: string
): Promise<Map<Region, DailyKpi>> {
  const res = await fetch(`${API_BASE}/admin/dashboard/kpi/regions?date=${date}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`지역별 Daily KPI 조회 실패: ${res.status}`);
  }

  const data = await res.json();
  const result = new Map<Region, DailyKpi>();
  
  for (const [region, kpi] of Object.entries(data)) {
    result.set(region as Region, kpi as DailyKpi);
  }

  return result;
}

/**
 * 트렌드 조회 (전일 대비)
 */
export async function getTrend(
  region: Region,
  today: string,
  yesterday: string
): Promise<{
  storyCtr: { value: number; change: number; direction: "up" | "down" | "stable" };
  bookingCr: { value: number; change: number; direction: "up" | "down" | "stable" };
  revenue: { value: number; change: number; direction: "up" | "down" | "stable" };
}> {
  const query = new URLSearchParams();
  query.set("region", region);
  query.set("today", today);
  query.set("yesterday", yesterday);

  const res = await fetch(`${API_BASE}/admin/dashboard/trend?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`트렌드 조회 실패: ${res.status}`);
  }

  return res.json();
}
