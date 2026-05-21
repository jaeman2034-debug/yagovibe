/**
 * Kakao 로그인 인증 유틸리티
 *
 * Kakao JS SDK 초기화 및 로그인 기능을 제공합니다.
 * SDK는 index.html에 없을 수 있으므로 여기서 스크립트를 주입해 로드합니다.
 */

declare global {
  interface Window {
    Kakao: any;
  }
}

/** 카카오 공식 CDN (JavaScript 키용 JS SDK — Maps용 dapi SDK와 다름) */
const KAKAO_JS_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

let scriptLoadPromise: Promise<void> | null = null;
let initInFlight: Promise<void> | null = null;

function ensureKakaoScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Kakao) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const sel = 'script[data-yago-kakao-js-sdk="1"]';
    const existing = document.querySelector<HTMLScriptElement>(sel);

    const settleOk = () => {
      resolve();
    };
    const settleFail = (e: Error) => {
      scriptLoadPromise = null;
      reject(e);
    };

    if (existing) {
      if (window.Kakao) {
        settleOk();
        return;
      }
      let pollId: number | null = null;
      let pollTries = 0;
      const cleanup = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onErr);
        if (pollId != null) {
          window.clearInterval(pollId);
          pollId = null;
        }
      };
      const onLoad = () => {
        cleanup();
        settleOk();
      };
      const onErr = () => {
        cleanup();
        settleFail(new Error("Kakao JS SDK script error"));
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onErr);
      /** 이미 로드된 스크립트는 load 이벤트가 다시 안 올 수 있음 */
      pollId = window.setInterval(() => {
        if (window.Kakao) {
          cleanup();
          settleOk();
        } else if (++pollTries > 400) {
          cleanup();
          settleFail(new Error("Kakao JS SDK: 기존 스크립트 로드 타임아웃"));
        }
      }, 50);
      queueMicrotask(() => {
        if (window.Kakao) {
          cleanup();
          settleOk();
        }
      });
      return;
    }

    const s = document.createElement("script");
    s.src = KAKAO_JS_SDK_SRC;
    s.async = true;
    s.dataset.yagoKakaoJsSdk = "1";
    s.onload = () => settleOk();
    s.onerror = () => settleFail(new Error("Kakao JS SDK failed to load (network or blocked)"));
    document.head.appendChild(s);
  });

  return scriptLoadPromise;
}

/**
 * Kakao JS SDK 로드 + Kakao.init (한 번)
 * 스크립트가 없으면 주입하므로, 예전처럼 window.Kakao만 폴링하다 타임아웃 나지 않습니다.
 */
export const initKakao = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Kakao?.isInitialized?.()) return Promise.resolve();
  if (initInFlight) return initInFlight;

  initInFlight = (async () => {
    try {
      await ensureKakaoScriptLoaded();
    } catch (e) {
      console.warn("⚠️ [Kakao Auth] SDK 스크립트 로드 실패:", e);
      return;
    }

    if (!window.Kakao) {
      console.warn("⚠️ [Kakao Auth] 스크립트 로드 후에도 window.Kakao 없음");
      return;
    }

    try {
      if (!window.Kakao.isInitialized()) {
        const kakaoJsKey = (import.meta.env.VITE_KAKAO_JS_KEY as string | undefined)?.trim();
        if (!kakaoJsKey) {
          console.warn("⚠️ [Kakao Auth] VITE_KAKAO_JS_KEY가 설정되지 않았습니다.");
          return;
        }
        window.Kakao.init(kakaoJsKey);
        console.log("✅ [Kakao Auth] Kakao SDK initialized");
      }
    } catch (error) {
      console.error("❌ [Kakao Auth] Kakao SDK 초기화 중 에러:", error);
    }
  })().finally(() => {
    initInFlight = null;
  });

  return initInFlight;
};

/**
 * Kakao 로그인 버튼 클릭 핸들러
 *
 * @param redirectUri - OAuth 리다이렉트 URI (기본값: 현재 도메인의 /oauth/kakao/callback)
 */
export const loginWithKakao = (redirectUri?: string): void => {
  if (typeof window === "undefined") {
    console.error("❌ [Kakao Auth] window is undefined");
    return;
  }

  if (!window.Kakao) {
    console.error("❌ [Kakao Auth] Kakao SDK is not loaded");
    return;
  }

  if (!window.Kakao.isInitialized()) {
    console.error("❌ [Kakao Auth] Kakao SDK is not initialized. Call initKakao() first.");
    return;
  }

  const defaultRedirectUri = redirectUri || `${window.location.origin}/oauth/kakao/callback`;

  console.log("🔥 [Kakao Auth] Kakao 로그인 시작:", {
    redirectUri: defaultRedirectUri,
  });

  window.Kakao.Auth.authorize({
    redirectUri: defaultRedirectUri,
  });
};

/**
 * Kakao OAuth 콜백에서 code 추출
 */
export const extractKakaoCode = (url?: string): string | null => {
  try {
    const urlObj = new URL(url || window.location.href);
    return urlObj.searchParams.get("code");
  } catch (error) {
    console.error("❌ [Kakao Auth] code 추출 실패:", error);
    return null;
  }
};

/**
 * Kakao 사용자 정보를 Firebase Custom Token으로 변환
 */
export async function createFirebaseCustomTokenFromKakao(accessToken: string): Promise<string> {
  const functionsUrl =
    import.meta.env.VITE_FUNCTIONS_URL || "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
  const response = await fetch(`${functionsUrl}/kakaoAuth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Kakao Custom Token 생성 실패");
  }

  const { customToken } = await response.json();
  return customToken;
}

/**
 * Kakao 로그인 완료 처리 (Firebase Custom Token 사용)
 */
export async function signInWithKakaoCustomToken(customToken: string): Promise<any> {
  const { signInWithCustomToken } = await import("firebase/auth");
  const { auth } = await import("./firebase");

  return await signInWithCustomToken(auth, customToken);
}
