/**
 * 🔥 QR Repository 레이어
 * Phase 1-4: QR 검증 + checkin write 연결
 */

import { auth } from "@/lib/firebase";

// Cloud Run URL 사용 (VITE_FUNCTIONS_ORIGIN 환경 변수 우선)
const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_ORIGIN ||
  "https://api-2q3hdcfwca-du.a.run.app";

/**
 * POST /qrVerifyAndCheckin : QR 검증 + 검인 기록 생성
 */
export async function qrVerifyAndCheckin(params: {
  associationId: string;
  tournamentId: string;
  matchId: string;
  qrToken: string;
}): Promise<{ ok: true; playerId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const idToken = await user.getIdToken();
  const res = await fetch(`${FUNCTIONS_BASE_URL}/qrVerifyAndCheckin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error || "UNKNOWN";
    const e = new Error(err);
    (e as any).status = res.status;
    throw e;
  }
  return data as { ok: true; playerId: string };
}

/**
 * POST /issueQrToken : QR 토큰 발급
 */
export async function issueQrToken(params: {
  associationId: string;
  tournamentId: string;
  playerId: string;
  expiresAt?: string;
}): Promise<{ ok: true; qrToken: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const idToken = await user.getIdToken();
  const res = await fetch(`${FUNCTIONS_BASE_URL}/issueQrToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error || "ISSUE_QR_FAILED";
    const e = new Error(err);
    (e as any).status = res.status;
    throw e;
  }
  return data as { ok: true; qrToken: string };
}

