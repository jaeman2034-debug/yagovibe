/** 팀 회비 납부 문서 ID — `teams/{teamId}/payments/{feeId}_{userId}` (멱등·upsert) */
export function buildTeamFeePaymentDocId(feeId: string, userId: string): string {
  return `${feeId}_${userId}`;
}

/** 문서 ID 마지막 `_` 기준 분리 (functions 백필과 동일 규칙) */
export function parseTeamFeePaymentDocId(docId: string): { feeId: string; userId: string } | null {
  const id = String(docId || "").trim();
  const last = id.lastIndexOf("_");
  if (last <= 0) return null;
  const feeId = id.slice(0, last).trim();
  const userId = id.slice(last + 1).trim();
  if (!feeId || !userId) return null;
  return { feeId, userId };
}

/**
 * `userId`에 `_`가 포함된 경우(예: `local_${autoId}`) 마지막 `_` 분리는 깨짐.
 * 이 쿼리·회차의 `feeId`가 확실할 때만 문서 ID 접두 `{feeId}_` 제거로 userId 복원.
 */
export function parsePaymentDocUserIdWithKnownFeeId(docId: string, feeId: string): string | null {
  const fid = String(feeId || "").trim();
  const id = String(docId || "").trim();
  if (!fid || !id) return null;
  const prefix = `${fid}_`;
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length).trim();
  return rest || null;
}

/**
 * Toss·웹훅·레거시가 섞인 status 문자열 → 클라 UI/집계용
 * (알 수 없는 값은 pending — 단 대문자 PAID·DONE 등은 paid 로 수렴)
 */
export function normalizeTeamFeePaymentStatus(raw: unknown): "paid" | "pending" | "partial" | "failed" | "cancelled" {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (["paid", "done", "succeeded", "success", "complete", "completed", "paid_out"].includes(s)) {
    return "paid";
  }
  if (s === "partial") {
    return "partial";
  }
  if (["failed", "fail", "aborted", "error", "declined"].includes(s)) {
    return "failed";
  }
  if (["cancelled", "canceled", "void", "refunded", "partial_canceled"].includes(s)) {
    return "cancelled";
  }
  if (
    ["pending", "processing", "in_progress", "ready", "awaiting", "waiting", "incomplete", "requires_action"].includes(
      s
    )
  ) {
    return "pending";
  }
  return "pending";
}
