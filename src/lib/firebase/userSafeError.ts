/**
 * Firestore/API 오류를 사용자 UI에 노출할 때 인프라·콘솔 URL 등을 숨깁니다.
 */

const DEFAULT_MESSAGE = "요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.";

const LOAD_CONTEXT_MESSAGES: Record<string, string> = {
  schedule: "일정을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
  schedules: "일정을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
  lineup: "라인업 목록을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

export function firebaseErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return "";
}

/** 사용자에게 보여줄 로드 실패 문구 (raw Firebase 메시지 사용 금지) */
export function userSafeLoadErrorMessage(context = "default"): string {
  return LOAD_CONTEXT_MESSAGES[context] ?? DEFAULT_MESSAGE;
}

function isInternalFirestoreMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("requires an index") ||
    m.includes("failed-precondition") ||
    m.includes("console.firebase.google.com") ||
    m.includes("firestore/indexes")
  );
}

/** 레거시: 화면에 넣기 전 문자열 정화 (내부 메시지면 fallback) */
export function sanitizeUserFacingMessage(
  error: unknown,
  fallback = DEFAULT_MESSAGE
): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message?.trim() ?? "";
  if (!msg || isInternalFirestoreMessage(msg)) return fallback;
  return fallback;
}

/** DEV: 전체 오류 / PROD: 코드만 로그 (URL·스택은 UI에 노출하지 않음) */
export function logDevError(label: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(label, error);
    return;
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  console.error(label, code || "error");
}
