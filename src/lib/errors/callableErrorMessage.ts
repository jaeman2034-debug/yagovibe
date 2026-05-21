/**
 * Firebase httpsCallable 실패 시 메시지 추출 (HttpsError·일반 Error 호환)
 */
export function callableErrorMessage(err: unknown): string {
  if (err == null) {
    return "요청 처리 중 오류가 발생했습니다.";
  }
  if (typeof err === "object" && err !== null) {
    const o = err as { message?: unknown; details?: unknown; code?: unknown };
    if (typeof o.details === "string" && o.details.trim()) {
      return o.details.trim();
    }
    if (o.details != null && typeof o.details === "object" && "message" in o.details) {
      const m = (o.details as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) return m.trim();
    }
    if (typeof o.message === "string" && o.message.trim()) {
      const msg = o.message.trim();
      const generic = msg === "internal" || msg === "INTERNAL";
      if (generic && typeof o.code === "string" && o.code.includes("/")) {
        return `요청 처리 중 오류가 발생했습니다. (${o.code})`;
      }
      return msg;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  try {
    return String(err);
  } catch {
    return "요청 처리 중 오류가 발생했습니다.";
  }
}
