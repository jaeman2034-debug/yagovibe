/**
 * AI API 호출 래퍼
 * 
 * 클라이언트에서 서버 API를 호출하는 함수들
 * 실제 AI 호출은 서버(Cloud Functions)에서만 수행
 */

// TODO: 실제 API 엔드포인트로 교체 (Cloud Functions URL 또는 Next.js API Routes)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://your-region-your-project.cloudfunctions.net";

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "API 호출 실패" }));
    throw new Error(error.message || `API 호출 실패: ${response.status}`);
  }

  return response.json();
}

/**
 * 승인 요청 요약 생성 요청
 * 
 * @param approvalId 승인 요청 ID (auditId)
 * @returns Promise (응답은 무시, 비동기 처리)
 */
export async function requestApprovalSummary(approvalId: string): Promise<void> {
  try {
    await apiFetch("/approvalSummary", {
      method: "POST",
      body: JSON.stringify({ approvalId }),
    });
  } catch (error) {
    console.error("[requestApprovalSummary] 요청 실패 (무시됨):", error);
    // 비동기 요청이므로 실패해도 본 흐름에 영향 없음
    // 참고: 자동 트리거(approvalSummaryOnCreate)가 있으므로 수동 호출은 선택사항
  }
}

/**
 * 일간 Impact 요약 생성 요청
 * 
 * @param tenantId 테넌트 ID
 * @param date 날짜 (YYYY-MM-DD 형식)
 * @returns Promise
 */
export async function requestDailyImpactSummary(tenantId: string, date: string): Promise<any> {
  return apiFetch("/dailyImpact", {
    method: "POST",
    body: JSON.stringify({ tenantId, date }),
  });
}

