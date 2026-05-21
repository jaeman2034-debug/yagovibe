import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

/** 클라이언트에서 재로그인이 필요한 Auth 관련 오류 (토큰·세션 무효) */
const SESSION_FATAL_AUTH_CODES = new Set([
  "auth/id-token-expired",
  "auth/user-token-expired",
  "auth/invalid-user-token",
  "auth/user-disabled",
  "auth/user-not-found",
]);

let recoveryInFlight = false;

export function getAuthErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function isRecoverableAuthSessionError(code: string | undefined): boolean {
  return !!code && SESSION_FATAL_AUTH_CODES.has(code);
}

/**
 * 토큰 만료 등으로 복구 불가한 세션 오류 시 로그아웃 후 로그인으로 이동.
 * @returns true면 호출측에서 추가 처리 생략 가능(이미 리다이렉트 진행)
 */
export async function recoverAuthSessionFromError(error: unknown): Promise<boolean> {
  const code = getAuthErrorCode(error);
  if (!isRecoverableAuthSessionError(code)) return false;
  if (recoveryInFlight) return true;
  recoveryInFlight = true;

  try {
    toast.error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  } catch {
    /* toast 미마운트 등 */
  }

  try {
    await signOut(auth);
  } catch {
    /* 이미 로그아웃 */
  }

  try {
    window.location.replace("/login");
  } catch {
    window.location.href = "/login";
  }

  return true;
}

/** API·Callable 등에서 수동으로 감쌀 때 사용 */
export async function callWithAuthRecovery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (await recoverAuthSessionFromError(e)) {
      throw new Error("AUTH_SESSION_RECOVERED");
    }
    throw e;
  }
}
