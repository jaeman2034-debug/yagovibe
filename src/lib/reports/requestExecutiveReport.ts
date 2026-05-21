/**
 * 경영용 PDF 리포트 요청 래퍼
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
 * 경영용 PDF 리포트 생성 요청
 * 
 * @param input.tenantId 테넌트 ID
 * @param input.from 시작 날짜 (ISO string)
 * @param input.to 종료 날짜 (ISO string)
 * @returns Promise<{ ok: boolean; fileName: string; url: string }>
 */
export async function requestExecutiveReport(input: {
  tenantId: string;
  from: string; // ISO string
  to: string; // ISO string
}): Promise<{ ok: boolean; fileName: string; url: string }> {
  return apiFetch("/executiveReport", {
    method: "POST",
    body: JSON.stringify(input),
  });
}










