/**
 * 🔥 Dashboard API - 운영 대시보드 v2 API 클라이언트
 */

import type {
  DashboardSummary,
  StorySlotStatus,
  ABExperimentStatus,
  SettlementSummary,
  DashboardAlert,
} from "../domain/dashboard.types";
import type { Story } from "../domain/story.types";
import type { Region } from "../domain/region.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 대시보드 요약 조회
 */
export async function getDashboardSummary(
  region?: Region
): Promise<DashboardSummary> {
  const query = region ? `?region=${region}` : "";
  
  const res = await fetch(`${API_BASE}/admin/dashboard${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`대시보드 요약 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 슬롯 상태 조회
 */
export async function getStorySlots(region?: Region): Promise<StorySlotStatus[]> {
  const query = region ? `?region=${region}` : "";
  
  const res = await fetch(`${API_BASE}/admin/stories/slots${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`스토리 슬롯 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 우선순위 업데이트
 */
export async function updateStoryPriority(
  storyId: string,
  priority: number
): Promise<Story> {
  const res = await fetch(`${API_BASE}/admin/stories/${storyId}/priority`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priority }),
  });

  if (!res.ok) {
    throw new Error(`스토리 우선순위 업데이트 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 기간 연장
 */
export async function extendStoryPeriod(
  storyId: string,
  days: number
): Promise<Story> {
  const res = await fetch(`${API_BASE}/admin/stories/${storyId}/extend`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });

  if (!res.ok) {
    throw new Error(`스토리 기간 연장 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 교체
 */
export async function replaceStory(
  slotIndex: number,
  newStoryId: string,
  region?: Region
): Promise<StorySlotStatus[]> {
  const res = await fetch(`${API_BASE}/admin/stories/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotIndex, newStoryId, region }),
  });

  if (!res.ok) {
    throw new Error(`스토리 교체 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * AB 실험 목록 조회
 */
export async function getABExperiments(
  region?: Region
): Promise<ABExperimentStatus[]> {
  const query = region ? `?region=${region}` : "";
  
  const res = await fetch(`${API_BASE}/admin/experiments${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`AB 실험 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * AB 실험 종료
 */
export async function endABExperiment(
  experimentKey: string,
  winner: "A" | "B"
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/experiments/${experimentKey}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winner }),
  });

  if (!res.ok) {
    throw new Error(`AB 실험 종료 실패: ${res.status}`);
  }
}

/**
 * 정산 요약 조회
 */
export async function getSettlementSummary(
  region?: Region
): Promise<SettlementSummary> {
  const query = region ? `?region=${region}` : "";
  
  const res = await fetch(`${API_BASE}/admin/settlements/summary${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`정산 요약 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 알림 목록 조회
 */
export async function getAlerts(
  region?: Region,
  level?: "info" | "warning" | "critical"
): Promise<DashboardAlert[]> {
  const query = new URLSearchParams();
  if (region) query.set("region", region);
  if (level) query.set("level", level);
  
  const res = await fetch(`${API_BASE}/admin/alerts?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`알림 목록 조회 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 알림 확인 처리
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/alerts/${alertId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`알림 확인 처리 실패: ${res.status}`);
  }
}

/**
 * 시즌 모드 강제 전환
 */
export async function forceSeasonMode(
  region: Region,
  enabled: boolean
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/season-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region, enabled }),
  });

  if (!res.ok) {
    throw new Error(`시즌 모드 전환 실패: ${res.status}`);
  }
}
