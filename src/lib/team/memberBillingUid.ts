/**
 * `teams/.../payments/{feeId}_{userId}` 조인 키 — `seedPaymentsForFee`·멤버 목록·동일 규칙
 */
export function getMemberBillingUid(
  data: { userId?: unknown; uid?: unknown },
  memberDocumentId: string
): string {
  const authUid =
    (typeof data.userId === "string" && data.userId.trim()) ||
    (typeof data.uid === "string" && data.uid.trim()) ||
    "";
  return authUid || memberDocumentId;
}

/**
 * 회비 payments 조인·필터 후보 키.
 * 연결 전에는 `uid === members 문서 ID`, 연결 후에는 `uid === Auth UID`가 되므로
 * 과거에 문서 ID로 저장된 `payments.memberId`와도 매칭되게 한다.
 */
const LOCAL_MEMBER_PREFIX = "local_";

function addKeyAndLocalGuestStrip(keys: Set<string>, raw: string) {
  const t = raw.trim();
  if (!t) return;
  keys.add(t);
  /** members 문서 ID가 `local_${autoId}` 일 때 payments 문서 접미만 `autoId` 인 레거시와 맞춤 */
  if (t.startsWith(LOCAL_MEMBER_PREFIX)) {
    const rest = t.slice(LOCAL_MEMBER_PREFIX.length);
    if (rest) keys.add(rest);
  }
}

export function memberBillingLookupKeys(m: {
  uid?: string;
  linkedAuthUid?: string;
  memberDocumentId?: string;
}): string[] {
  const keys = new Set<string>();
  addKeyAndLocalGuestStrip(keys, String(m.uid ?? ""));
  addKeyAndLocalGuestStrip(keys, String(m.linkedAuthUid ?? ""));
  addKeyAndLocalGuestStrip(keys, String(m.memberDocumentId ?? ""));
  return [...keys];
}

/**
 * `payments` 필드(`local_*`) vs 문서 ID 접미(autoId) 혼재 시 로스터와 매칭할 후보 키.
 * Firebase 일반 UID에는 `local_` 붙이지 않아도, 로스터에 해당 가상 키가 없으면 매칭 실패만 함.
 */
export function expandPaymentPersonKeysForRosterMatch(raw: string): string[] {
  const t = String(raw || "").trim();
  if (!t) return [];
  const out = new Set<string>([t]);
  if (t.startsWith(LOCAL_MEMBER_PREFIX)) {
    const rest = t.slice(LOCAL_MEMBER_PREFIX.length);
    if (rest) out.add(rest);
  } else {
    out.add(`${LOCAL_MEMBER_PREFIX}${t}`);
  }
  return [...out];
}
