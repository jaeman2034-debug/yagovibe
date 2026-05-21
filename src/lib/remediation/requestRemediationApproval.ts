/**
 * ✅ COMMIT 25: Remediation 승인 요청 (클라이언트)
 */

import { apiFetch } from "@/lib/api/ai";

/**
 * ✅ COMMIT 25: Remediation 승인
 */
export async function approveRemediation(input: {
  approvalId: string;
  extendMinutes?: number;
}) {
  return apiFetch(`/approveRemediation`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * ✅ COMMIT 25: Remediation 중단 (reject)
 */
export async function rejectRemediation(input: { approvalId: string }) {
  return apiFetch(`/rejectRemediation`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

