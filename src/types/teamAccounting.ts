/**
 * 팀 현금 출납부 (회계)
 *
 * Firestore: `teams/{teamId}/cashBook/{txId}` + 요약 `teams/{teamId}/cashBookSummary/default`
 * - 거래: `kind` "income" | "expense", `category`, `amount`, `occurredAt`, `createdByUid`, `isDeleted`
 * - 회비 자동 반영: Cloud Function `onFeePaidCashBookEntry`가 `teams/.../payments` paid 전환 시
 *   `source: "membership"` 수입 행을 멱등 생성 (클라에서 `addDoc`로 중복 넣지 말 것)
 */
/** 팀 현금 출납부 — 수입·지출 카테고리 (Firestore rules와 동일 enum 유지) */

export type TeamCashKind = "income" | "expense";

/** 수입 카테고리 (rules: membership | donation | after_meal | etc) */
export type TeamCashIncomeCategory = "membership" | "donation" | "after_meal" | "etc";

/** 지출 카테고리 (rules: association_fee | event | meal | ceremony | refund | etc) */
export type TeamCashExpenseCategory =
  | "association_fee"
  | "event"
  | "meal"
  | "ceremony"
  | "refund"
  | "etc";

export type TeamCashCategory = TeamCashIncomeCategory | TeamCashExpenseCategory;

export type TeamCashBookSource = "manual" | "membership" | "auto";

/** 자동·연동 거래 추적 (CF가 기록, 클라이언트 생성 시 rules로 필드 금지) */
export type TeamCashBookSourceRefType = "feePayment" | "manual" | "eventSponsor" | "feeRefund";

export interface TeamCashReceipt {
  imageUrl: string;
  uploadedAt: string; // ISO
  uploadedByUid: string;
  /** 영수증 OCR로 추출한 텍스트 스냅샷(선택, 감사·디버깅용) */
  ocrRawText?: string;
}

/** rules / CF와 동일 집합 — 클라이언트 검증용 */
export const TEAM_CASH_INCOME_CATEGORIES: readonly TeamCashIncomeCategory[] = [
  "membership",
  "donation",
  "after_meal",
  "etc",
] as const;

export const TEAM_CASH_EXPENSE_CATEGORIES: readonly TeamCashExpenseCategory[] = [
  "association_fee",
  "event",
  "meal",
  "ceremony",
  "refund",
  "etc",
] as const;

/** 구버전 category → 신규 enum (기존 문서 호환) */
const LEGACY_INCOME: Record<string, TeamCashIncomeCategory> = {
  monthly_fee: "membership",
  event_donation: "donation",
  post_training_donation: "after_meal",
  income_other: "etc",
};

const LEGACY_EXPENSE: Record<string, TeamCashExpenseCategory> = {
  association_fee: "association_fee",
  event_cost: "event",
  meal_drink: "meal",
  condolence: "ceremony",
  expense_other: "etc",
};

export function normalizeTeamCashCategory(kind: TeamCashKind, raw: string): TeamCashCategory | null {
  if (!raw) return null;
  if (kind === "income") {
    if ((TEAM_CASH_INCOME_CATEGORIES as readonly string[]).includes(raw)) return raw as TeamCashIncomeCategory;
    return LEGACY_INCOME[raw] ?? null;
  }
  if ((TEAM_CASH_EXPENSE_CATEGORIES as readonly string[]).includes(raw)) return raw as TeamCashExpenseCategory;
  return LEGACY_EXPENSE[raw] ?? null;
}

export interface TeamCashBookTransaction {
  id: string;
  kind: TeamCashKind;
  category: TeamCashCategory;
  amount: number;
  occurredAt: string; // ISO
  memo?: string | null;
  counterpartyName?: string | null;
  counterpartyUid?: string | null;
  source: TeamCashBookSource;
  sourceRefId?: string | null;
  sourceRefType?: TeamCashBookSourceRefType | null;
  receipt?: TeamCashReceipt | null;
  isDeleted: boolean;
  voidReason?: string | null;
  createdByUid: string;
}

export interface TeamCashBookSummary {
  balance: number;
  /** CF reconcileCashBookSummary 가 마지막으로 검증한 시각(있을 때만) */
  reconciledAt?: string;
  lastReconciledDelta?: number;
  lastReconciledTxCount?: number;
}

export interface TeamMonthlyContributionTopRow {
  uid: string;
  name: string;
  total: number;
  membership: number;
  donation: number;
}

export interface TeamMonthlySummary {
  monthId: string; // yyyy-mm
  totalIncome: number;
  totalExpense: number;
  net: number;
  topIncomeCategory?: TeamCashCategory | null;
  topExpenseCategory?: TeamCashCategory | null;
  memberContributionTop: TeamMonthlyContributionTopRow[];
  updatedAt?: string;
}

export const TEAM_CASH_INCOME_LABELS: Record<TeamCashIncomeCategory, string> = {
  membership: "💰 월 회비",
  donation: "🎁 행사 찬조",
  after_meal: "🥤 운동 후 찬조",
  etc: "📦 기타",
};

export const TEAM_CASH_EXPENSE_LABELS: Record<TeamCashExpenseCategory, string> = {
  association_fee: "🏛 협회 회비",
  event: "🎉 행사 비용",
  meal: "🍗 식사/음료",
  ceremony: "💐 애경사",
  refund: "↩️ 회비 환불",
  etc: "📦 기타",
};

export function teamCashCategoryLabel(kind: TeamCashKind, category: TeamCashCategory): string {
  if (kind === "income") {
    return TEAM_CASH_INCOME_LABELS[category as TeamCashIncomeCategory] ?? category;
  }
  return TEAM_CASH_EXPENSE_LABELS[category as TeamCashExpenseCategory] ?? category;
}
