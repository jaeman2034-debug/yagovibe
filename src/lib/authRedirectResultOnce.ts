import { getRedirectResult, type UserCredential } from "firebase/auth";
import { auth } from "./firebase";

let redirectResultOnce: Promise<UserCredential | null> | null = null;

/**
 * signInWithRedirect 복귀 직후 getRedirectResult는 1회만 유효.
 * Strict Mode 이중 effect에서도 동일 Promise 공유.
 */
function logRedirectErrorCode(err: unknown) {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : undefined;
  if (code) {
    console.error("[Auth] 리다이렉트 에러 코드:", code);
    if (
      code === "auth/cross-origin-auth-not-supported" ||
      code === "auth/unauthorized-domain" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      console.warn(
        "[Auth] 도메인·쿠키 점검: Firebase Console → Authentication → Settings → Authorized domains, " +
          "호스트와 authDomain 일치(VITE_FIREBASE_AUTH_DOMAIN)."
      );
    }
  }
}

export function getRedirectResultOnce(): Promise<UserCredential | null> {
  if (!redirectResultOnce) {
    redirectResultOnce = getRedirectResult(auth)
      .then((result) => {
        if (import.meta.env.DEV && result?.user) {
          console.log("[Auth] getRedirectResult 성공:", {
            uid: result.user.uid,
            email: result.user.email ?? null,
          });
        }
        return result;
      })
      .catch((err) => {
        console.error("❌ [getRedirectResultOnce] getRedirectResult 실패:", err);
        logRedirectErrorCode(err);
        redirectResultOnce = null;
        return null;
      });
  }
  return redirectResultOnce;
}
