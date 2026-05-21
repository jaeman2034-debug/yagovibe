/**
 * ✅ COMMIT 20: Ops Copilot 요청 래퍼
 */

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
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function requestOpsCopilot(input: {
  tenantId: string;
  question: string;
}) {
  return apiFetch("/opsCopilot", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

