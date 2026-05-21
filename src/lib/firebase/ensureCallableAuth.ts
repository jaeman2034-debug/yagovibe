import { auth } from "@/lib/firebase";
import { getFirebaseAuthBlockedHint } from "@/lib/firebase/firebaseAuthErrorHints";

/**
 * HTTPS Callable 호출 전: 세션이 없으면 Firebase가 `unauthenticated`를 반환한다.
 * 기본은 캐시된 토큰을 사용하고, 필요할 때만 강제 갱신한다.
 * (로컬 API 키 리퍼러 제한 환경에서 매 호출마다 `getIdToken(true)`를 쓰면
 * Secure Token/Identity Toolkit 차단 오류가 반복될 수 있음)
 */
export async function ensureCallableAuth(): Promise<void> {
  const u = auth.currentUser;
  if (!u) {
    throw new Error(
      "로그인이 필요합니다. 로그아웃 상태면 다시 로그인하고, 로그인 중이면 페이지를 새로고침한 뒤 다시 시도해 주세요."
    );
  }
  try {
    /** 1) 네트워크 강제 갱신 없이 현재 토큰 사용 */
    const cached = await u.getIdToken();
    if (cached && cached.length > 0) return;
    /** 2) 토큰이 비어 있을 때만 강제 갱신 */
    await u.getIdToken(true);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? "");
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: unknown }).code ?? "")
        : "";
    const hint = getFirebaseAuthBlockedHint(`${code} ${msg}`);
    if (hint) throw new Error(hint);
    throw e;
  }
}
