/**
 * ✅ COMMIT 27: Remediation 정책 추천 요청 (클라이언트)
 */

import { apiFetch } from "@/lib/api/ai";

/**
 * ✅ COMMIT 27: Remediation 정책 추천
 */
export async function requestRemediationRecommendation(input: {
  tenantId: string;
  anomaly: { metric: string; level: string };
}) {
  return apiFetch(`/recommendRemediationPolicy`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

