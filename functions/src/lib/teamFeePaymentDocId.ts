/** 팀 회비 납부 문서 ID — `teams/{teamId}/payments/{feeId}_{userId}` */
export function buildTeamFeePaymentDocId(feeId: string, userId: string): string {
  return `${feeId}_${userId}`;
}

/**
 * 문서 ID를 마지막 `_` 기준으로 분리 (feeId 안에 `_`가 있어도 uid는 마지막 세그먼트로 가정)
 */
export function parseTeamFeePaymentDocId(docId: string): { feeId: string; userId: string } | null {
  const id = String(docId || "").trim();
  const last = id.lastIndexOf("_");
  if (last <= 0) return null;
  const feeId = id.slice(0, last).trim();
  const userId = id.slice(last + 1).trim();
  if (!feeId || !userId) return null;
  return { feeId, userId };
}

/** `userId`에 `_` 포함 시(last `_` 분리 깨짐) 알려진 feeId로 접두 제거 */
export function parsePaymentDocUserIdWithKnownFeeId(docId: string, feeId: string): string | null {
  const fid = String(feeId || "").trim();
  const id = String(docId || "").trim();
  if (!fid || !id) return null;
  const prefix = `${fid}_`;
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length).trim();
  return rest || null;
}
