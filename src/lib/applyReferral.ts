/**
 * 🔥 추천(리퍼럴) 적용 로직
 *
 * 서버 Callable로 처리 — 타인 users 문서 업데이트는 클라이언트에서 하지 않음.
 */

import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { functions } from "@/lib/firebase";

const auth = getAuth();

/** 로그인 전 URL 등에서 추천 코드를 저장 */
export function saveReferralCode(code: string | null | undefined): void {
  const c = typeof code === "string" ? code.trim() : "";
  if (!c) return;
  try {
    localStorage.setItem("referralCode", c);
  } catch {
    /* ignore */
  }
}

/**
 * 추천 코드 적용
 *
 * @returns 적용 성공 여부
 */
export async function applyReferral(): Promise<boolean> {
  try {
    const code = localStorage.getItem("referralCode");
    if (!code) {
      console.log("📝 [applyReferral] 추천 코드 없음 (정상)");
      return false;
    }

    const user = auth.currentUser;
    if (!user) {
      console.warn("⚠️ [applyReferral] 로그인되지 않은 사용자");
      return false;
    }

    const fn = httpsCallable<{ inviteCode: string }, { ok: boolean; reason?: string }>(
      functions,
      "applyReferralCallable"
    );
    const res = await fn({ inviteCode: code.trim() });
    const data = res.data;

    if (!data.ok) {
      if (data.reason === "invalid_code" || data.reason === "ambiguous_code") {
        localStorage.removeItem("referralCode");
      }
      if (data.reason === "self_referral") {
        localStorage.removeItem("referralCode");
      }
      console.warn("⚠️ [applyReferral] 적용 실패:", data.reason);
      return false;
    }

    console.log("✅ [applyReferral] 추천 적용 완료");
    localStorage.removeItem("referralCode");
    return true;
  } catch (error) {
    console.error("❌ [applyReferral] 추천 적용 실패:", error);
    return false;
  }
}
