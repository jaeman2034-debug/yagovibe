/**
 * 서버(Functions)용 원장 파싱 — 클라이언트 parseLedgerTx와 동일 규칙 유지.
 * @see src/services/federationAccountingService.ts parseLedgerTx
 */

const FED_INCOME_SOURCE_KEYS = new Set([
  "membership_fee",
  "competition_fee",
  "subsidy",
  "sponsorship",
  "registration_fee",
  "donation",
  "other",
]);

export type LedgerTxType = "income" | "expense";
export type LedgerDomain = "general" | "restricted_fund";

export type ParsedLedgerTx = {
  id: string;
  type: LedgerTxType;
  domain: string;
  ledgerDomain: LedgerDomain;
  category: string;
  amount: number;
  occurredAt: string;
  memo: string | null;
  competitionId?: string;
  manualIncome?: true;
  incomeSourceType?: string;
  incomeStatus?: "expected" | "pending" | "paid";
  fundSource?: string;
  fundPurpose?: string;
  restrictedFund?: true;
  relatedFundSource?: string;
  relatedFundIncomeId?: string;
  expectedAt?: string;
  payerName?: string;
};

export function parseLedgerTxServer(id: string, raw: Record<string, unknown>): ParsedLedgerTx {
  const t = String(raw.type || "");
  const type: LedgerTxType = t === "expense" ? "expense" : "income";

  let incomeSourceType: string | undefined;
  if (typeof raw.incomeSourceType === "string" && FED_INCOME_SOURCE_KEYS.has(raw.incomeSourceType)) {
    incomeSourceType = raw.incomeSourceType;
  }

  let incomeStatus: "expected" | "pending" | "paid" | undefined;
  if (raw.incomeStatus === "expected" || raw.incomeStatus === "pending" || raw.incomeStatus === "paid") {
    incomeStatus = raw.incomeStatus;
  }

  const expectedAt =
    typeof raw.expectedAt === "string" && raw.expectedAt.trim() ? raw.expectedAt.trim() : undefined;

  const payerNameIncome =
    typeof raw.payerName === "string" && raw.payerName.trim() ? raw.payerName.trim().slice(0, 400) : undefined;

  const fundSource =
    typeof raw.fundSource === "string" && raw.fundSource.trim() ? raw.fundSource.trim().slice(0, 400) : undefined;
  const fundPurpose =
    typeof raw.fundPurpose === "string" && raw.fundPurpose.trim() ? raw.fundPurpose.trim().slice(0, 400) : undefined;

  let ledgerDomain: LedgerDomain = "general";
  if (raw.ledgerDomain === "restricted_fund") ledgerDomain = "restricted_fund";
  else if (raw.ledgerDomain === "general") ledgerDomain = "general";
  else if (type === "income" && incomeSourceType === "subsidy") ledgerDomain = "restricted_fund";
  else if (type === "income" && raw.isRestrictedFund === true) ledgerDomain = "restricted_fund";
  else if (type === "expense" && raw.restrictedFund === true) ledgerDomain = "restricted_fund";

  const relatedFundSource =
    typeof raw.relatedFundSource === "string" && raw.relatedFundSource.trim()
      ? raw.relatedFundSource.trim().slice(0, 400)
      : undefined;

  const relatedFundIncomeId =
    typeof raw.relatedFundIncomeId === "string" && raw.relatedFundIncomeId.trim()
      ? raw.relatedFundIncomeId.trim().slice(0, 120)
      : undefined;

  const competitionId =
    typeof raw.competitionId === "string" && raw.competitionId.trim() ? raw.competitionId.trim() : undefined;

  const base: ParsedLedgerTx = {
    id,
    type,
    domain: String(raw.domain || "").trim() || "unknown",
    ledgerDomain,
    category: String(raw.category || "").trim() || "uncategorized",
    amount: typeof raw.amount === "number" ? Math.floor(raw.amount) : 0,
    occurredAt: typeof raw.occurredAt === "string" && raw.occurredAt.trim() ? raw.occurredAt.trim() : "",
    memo: raw.memo != null ? String(raw.memo) : null,
  };

  if (competitionId) base.competitionId = competitionId;
  if (raw.manualIncome === true) base.manualIncome = true;
  if (incomeSourceType) base.incomeSourceType = incomeSourceType;
  if (incomeStatus) base.incomeStatus = incomeStatus;
  if (payerNameIncome) base.payerName = payerNameIncome;
  if (expectedAt) base.expectedAt = expectedAt;
  if (fundSource) base.fundSource = fundSource;
  if (fundPurpose) base.fundPurpose = fundPurpose;
  if (type === "expense" && raw.restrictedFund === true) base.restrictedFund = true;
  if (relatedFundSource) base.relatedFundSource = relatedFundSource;
  if (relatedFundIncomeId) base.relatedFundIncomeId = relatedFundIncomeId;

  return base;
}

export function occurredInCalendarMonth(iso: string, year: number, month1to12: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() + 1 === month1to12;
}
