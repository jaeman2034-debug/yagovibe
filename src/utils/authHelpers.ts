/**
 * 🔥 인증 관련 유틸리티
 *
 * - 구글: 전부 signInWithPopup (모바일 redirect는 저장소·리다이렉트 상태 유실로 hasUser:false 빈번)
 * - AuthProvider의 getRedirectResultOnce는 예전 세션·링크 호환용으로 유지
 *
 * 인앱 브라우저(카카오 등)는 LoginPage에서 구글 버튼을 막고 전화 로그인 등을 안내.
 */

import type { Auth } from "firebase/auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
} from "firebase/auth";

/** DEV: `.env.local`에 `VITE_AUTH_SESSION_PERSISTENCE_DEV=true` — Chrome 탭마다 다른 계정 테스트 (탭 닫으면 로그인 풀림) */
export function useSessionPersistenceInDev(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_AUTH_SESSION_PERSISTENCE_DEV?.trim().toLowerCase() === "true"
  );
}

/**
 * 로그아웃 전까지 세션 유지(새로고침·브라우저 재실행).
 * `initializeAuth` persistence와 동일한 우선순위로, OAuth·이메일 등 로그인 직전에 한 번 더 맞춤.
 */
export async function ensureDurableAuthPersistence(auth: Auth): Promise<void> {
  if (useSessionPersistenceInDev()) {
    await setPersistence(auth, browserSessionPersistence);
    return;
  }
  try {
    await setPersistence(auth, browserLocalPersistence);
    return;
  } catch (e1) {
    console.warn("[auth] browserLocalPersistence 실패, indexedDBLocalPersistence 시도:", e1);
  }
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
    return;
  } catch (e2) {
    console.warn("[auth] indexedDBLocalPersistence 실패, browserSessionPersistence 시도:", e2);
  }
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch (e3) {
    console.warn("[auth] setPersistence 모두 실패 — 로그인은 계속 시도:", e3);
  }
}

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform)) {
    return true;
  }
  return false;
};

export const isInAppBrowser = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    /kakaotalk|instagram|fb_iab|line|naver|daum|band|wv|webview/i.test(ua) ||
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView !== undefined
  );
};

/**
 * 구글 로그인 버튼 노출용 — 카카오톡·인스타·페이스북 인앱만 true.
 * `isInAppBrowser`는 wv/line 등으로 일반 크롬·삼성 브라우저가 오탐될 수 있어 OAuth CTA에는 이걸 쓴다.
 */
export function isRealInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /KAKAOTALK|INSTAGRAM|FBAN|FBAV/i.test(navigator.userAgent);
}

export type GoogleSignInOutcome = { mode: "popup" } | { mode: "redirect" };

/**
 * 예전: 모바일만 redirect. 현재는 저장소/리다이렉트 상태 이슈로 기본값 false(팝업만).
 * 필요 시 .env 에 `VITE_GOOGLE_REDIRECT_ON_MOBILE=1` 로 복구(디버그용).
 */
export function shouldUseGoogleRedirectForMobileWeb(): boolean {
  if (typeof window === "undefined") return false;
  const flag = import.meta.env.VITE_GOOGLE_REDIRECT_ON_MOBILE;
  if (flag === "1" || flag === "true") {
    return isMobileDevice() && !import.meta.env.DEV;
  }
  return false;
}

/** Google 로그인 — 기본 팝업, 플래그 시에만 모바일 redirect */
export async function signInWithGoogleAdaptive(
  auth: Auth,
  provider: GoogleAuthProvider
): Promise<GoogleSignInOutcome> {
  const useRedirect = shouldUseGoogleRedirectForMobileWeb();
  const runtimeHost = typeof window !== "undefined" ? window.location.host : "SSR";
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "SSR";
  const runtimeProjectId = auth.app.options.projectId ?? null;
  const runtimeAuthDomain = auth.app.options.authDomain ?? null;
  const runtimeApiKeyPreview =
    typeof auth.app.options.apiKey === "string" && auth.app.options.apiKey.length > 0
      ? `${auth.app.options.apiKey.substring(0, 10)}...`
      : null;
  if (import.meta.env.DEV) {
    console.log("[Google Login] adaptive", {
      useRedirect,
      mobile: isMobileDevice(),
      isRealInApp: isRealInAppBrowser(),
      host: runtimeHost,
      origin: runtimeOrigin,
      projectId: runtimeProjectId,
      authDomain: runtimeAuthDomain,
      apiKeyPreview: runtimeApiKeyPreview,
    });
  }

  await ensureDurableAuthPersistence(auth);

  if (useRedirect) {
    if (import.meta.env.DEV) {
      console.log("[Google Login] signInWithRedirect");
    }
    await signInWithRedirect(auth, provider);
    return { mode: "redirect" };
  }

  try {
    const cred = await signInWithPopup(auth, provider);
    if (import.meta.env.DEV) {
      console.log("[Google Login] signInWithPopup ok", {
        uid: cred.user?.uid ?? null,
      });
    }
    return { mode: "popup" };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "unknown";
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : String(err);
    console.error("[Google Login] signInWithPopup 실패", {
      code,
      message,
      host: runtimeHost,
      origin: runtimeOrigin,
      projectId: runtimeProjectId,
      authDomain: runtimeAuthDomain,
      apiKeyPreview: runtimeApiKeyPreview,
    });
    throw err;
  }
}

export const signInWithGoogle = async (auth: Auth, provider: GoogleAuthProvider): Promise<void> => {
  await signInWithGoogleAdaptive(auth, provider);
};
