/**
 * Hot fix — venue-scoped deposit account for Reservation Detail.
 * Ops policy (Nowon): 수락산 = dedicated account; other venues = federation account.
 * Scope: bankAccountGuide display only (not PG / virtual account).
 */

export const GENERIC_DEPOSIT_ACCOUNT_GUIDE =
  "협회가 안내한 지정 계좌로 입금해 주세요. (계좌 정보는 협회 공지·운영 안내를 따릅니다.)";

/** Federation default (non–수락산) — Nowon ops */
export const NOWON_FEDERATION_DEPOSIT_GUIDE = [
  "국민은행",
  "536201-01-485137",
  "노원구축구협회",
].join("\n");

/** 수락산구장 전용 */
export const NOWON_SURAKSAN_DEPOSIT_GUIDE = [
  "국민은행",
  "278501-04-116237",
  "수락산구장 전용",
].join("\n");

export function isGenericDepositAccountGuide(guide: string | null | undefined): boolean {
  const t = (guide || "").trim();
  if (!t) return true;
  if (t === GENERIC_DEPOSIT_ACCOUNT_GUIDE) return true;
  if (t.includes("협회가 안내한 지정 계좌")) return true;
  return false;
}

export function isSuraksanVenue(venueId: string, venueName?: string | null): boolean {
  const id = (venueId || "").toLowerCase();
  const name = venueName || "";
  return id.includes("suraksan") || name.includes("수락산");
}

/** Code-level ops fallback when Firestore venue/federation fields are empty. */
export function nowonOpsDepositFallback(
  federationSlug: string,
  venueId: string,
  venueName?: string | null
): string | null {
  if (federationSlug !== "nowon-football") return null;
  if (isSuraksanVenue(venueId, venueName)) return NOWON_SURAKSAN_DEPOSIT_GUIDE;
  return NOWON_FEDERATION_DEPOSIT_GUIDE;
}

export function formatDepositAccountGuide(input: {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
}): string | null {
  const bank = (input.bankName || "").trim();
  const num = (input.accountNumber || "").trim();
  const holder = (input.accountHolder || "").trim();
  if (!bank && !num && !holder) return null;
  return [bank, num, holder].filter(Boolean).join("\n");
}
