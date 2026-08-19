/**
 * Venue-scoped deposit account contract.
 * Canonical values live in federations/{slug}/venues/{venueId}.depositAccount.
 */

export const GENERIC_DEPOSIT_ACCOUNT_GUIDE =
  "협회가 안내한 지정 계좌로 입금해 주세요. (계좌 정보는 협회 공지·운영 안내를 따릅니다.)";

export type CanonicalVenueDepositAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export function isGenericDepositAccountGuide(guide: string | null | undefined): boolean {
  const t = (guide || "").trim();
  if (!t) return true;
  if (t === GENERIC_DEPOSIT_ACCOUNT_GUIDE) return true;
  if (t.includes("협회가 안내한 지정 계좌")) return true;
  return false;
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

export function parseCanonicalVenueDepositAccount(
  raw: unknown
): CanonicalVenueDepositAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const bankName = typeof value.bankName === "string" ? value.bankName.trim() : "";
  const accountNumber =
    typeof value.accountNumber === "string" ? value.accountNumber.trim() : "";
  const accountHolder =
    typeof value.accountHolder === "string" ? value.accountHolder.trim() : "";
  if (!bankName || !accountNumber || !accountHolder) return null;
  return { bankName, accountNumber, accountHolder };
}

export function hasConflictingDepositAccountGuide(input: {
  account: CanonicalVenueDepositAccount;
  depositAccountGuide?: string | null;
}): boolean {
  const legacy = (input.depositAccountGuide || "").trim();
  if (!legacy || isGenericDepositAccountGuide(legacy)) return false;
  return legacy !== formatDepositAccountGuide(input.account);
}
