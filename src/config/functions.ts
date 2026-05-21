/**
 * 🔥 Functions Base URL (에뮬레이터 + 프로덕션 분기)
 *
 * HTTP fetch로 Functions 호출할 때 사용
 * (httpsCallable은 connectFunctionsEmulator로 자동 처리됨)
 */
const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const FUNCTIONS_BASE_URL =
  isLocalhost && useEmulator
    ? "http://localhost:5011/yago-vibe-spt/asia-northeast3"
    : "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
