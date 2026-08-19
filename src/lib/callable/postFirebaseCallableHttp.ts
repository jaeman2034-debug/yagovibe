import { getAuth } from "firebase/auth";

const FUNCTIONS_REGION = "asia-northeast3";

/** 로컬 dev에서 httpsCallable이 에뮬레이터(8210 등)로 붙는 경우 프로덕션 HTTPS로 우회 */
export function useProductionCallableHttp(): boolean {
  return import.meta.env.VITE_USE_EMULATOR !== "true";
}

/**
 * 배포된 Callable 이름 기준 HTTPS URL.
 * 우선순위: VITE_FIREBASE_CALLABLE_BASE_URL → 에뮬(명시 시) → VITE_API_BASE_URL → VITE_FUNCTIONS_ORIGIN → 기본 호스트
 */
export function resolveFirebaseCallableUrl(functionName: string): string {
  const name = String(functionName || "").replace(/^\//, "");
  const baseCallable = String(import.meta.env.VITE_FIREBASE_CALLABLE_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (baseCallable) {
    return `${baseCallable}/${name}`;
  }

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const useEmu =
    isLocal &&
    import.meta.env.VITE_USE_EMULATOR === "true" &&
    import.meta.env.VITE_FUNCTIONS_EMULATOR === "true";
  if (useEmu) {
    const port = String(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || "5011");
    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-spt");
    return `http://127.0.0.1:${port}/${projectId}/${FUNCTIONS_REGION}/${name}`;
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (apiBase.includes("cloudfunctions.net")) {
    return `${apiBase}/${name}`;
  }

  const fnOrigin = String(import.meta.env.VITE_FUNCTIONS_ORIGIN || "").trim().replace(/\/$/, "");
  if (fnOrigin.includes("cloudfunctions.net")) {
    return `${fnOrigin}/${name}`;
  }

  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-spt");
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/${name}`;
}

type CallableWireResult<T> = { result?: T; error?: { message?: string; status?: string } };

export async function postFirebaseCallableHttp<T>(functionName: string, data: unknown): Promise<T> {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }
  const token = await user.getIdToken();
  const url = resolveFirebaseCallableUrl(functionName);
  if (import.meta.env.DEV) {
    console.debug(`[Callable HTTP] ${functionName}`, url);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });
  const json = (await res.json().catch(() => ({}))) as CallableWireResult<T>;
  if (json.error) {
    const msg = json.error.message || json.error.status || `${functionName} 호출 실패`;
    throw new Error(msg);
  }
  if (json.result === undefined || json.result === null) {
    throw new Error(
      res.ok
        ? `${functionName} 응답이 비어 있습니다.`
        : `${functionName} HTTP ${res.status} (본문 파싱 실패)`
    );
  }
  return json.result;
}
