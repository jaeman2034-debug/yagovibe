/** 협회 운영(팀·회비) — federations/{slug}/teams 등. SPEC: FEDERATION_OPERATING_SYSTEM_SPEC.md */

export type FederationOperatingTeamAgeGroup = "20_30" | "40" | "50" | "60" | "other";
export type FederationOperatingTeamCategory = "club" | "reserve";

export interface FederationOperatingTeam {
  id: string;
  name: string;
  ageGroup: FederationOperatingTeamAgeGroup;
  category: FederationOperatingTeamCategory;
  annualFeeAmount: number;
  isActive: boolean;
  createdAt: string;
}

export type TeamFeePaymentPlan = "lump_sum" | "monthly";
export type TeamFeeAccountStatus = "unpaid" | "partial" | "paid";

export interface TeamFeeAccount {
  id: string;
  teamId: string;
  year: number;
  annualFeeAmount: number;
  paymentPlan: TeamFeePaymentPlan;
  expectedInstallments: number;
  billedAmount: number;
  paidAmount: number;
  status: TeamFeeAccountStatus;
}

export type TeamFeePaymentMethod = "cash" | "bank_transfer" | "card";

export interface TeamFeePayment {
  id: string;
  teamId: string;
  year: number;
  installmentNo?: number;
  amount: number;
  paidAt: string;
  method?: TeamFeePaymentMethod;
  memo?: string;
  createdByUid: string;
}

export type CreateTeamFeePaymentInput = {
  teamId: string;
  year: number;
  amount: number;
  paidAt: string;
  method?: TeamFeePaymentMethod;
  installmentNo?: number;
  memo?: string;
};

/** 대회 (운영 ERP) */
export type FederationOperatingCompetitionKind = "regular" | "league" | "friendly";
export type FederationOperatingCompetitionStatus = "planned" | "open" | "closed" | "settled";

export interface FederationOperatingCompetition {
  id: string;
  name: string;
  year: number;
  kind: FederationOperatingCompetitionKind;
  teamBaseFee: number;
  extraTeamFee: number;
  status: FederationOperatingCompetitionStatus;
}

export type CompetitionEntryStatus = "unpaid" | "partial" | "paid";

export interface FederationOperatingCompetitionEntry {
  id: string;
  competitionId: string;
  teamId: string;
  teamName?: string;
  entryCount: number;
  baseFeeAmount: number;
  extraFeeAmount: number;
  totalFeeAmount: number;
  paidAmount: number;
  status: CompetitionEntryStatus;
}

export interface CompetitionFeePayment {
  id: string;
  entryId: string;
  competitionId: string;
  teamId: string;
  amount: number;
  paidAt: string;
  method?: TeamFeePaymentMethod;
  memo?: string;
  createdByUid: string;
}

export type CreateCompetitionFeePaymentInput = {
  entryId: string;
  competitionId: string;
  teamId: string;
  amount: number;
  paidAt: string;
  method?: TeamFeePaymentMethod;
  memo?: string;
};

/** 참가 단위 수(≥1) 기준 참가비 — SPEC과 동일 */
export function calculateCompetitionEntryFees(
  entryCount: number,
  teamBaseFee: number,
  extraTeamFee: number
): { baseFeeAmount: number; extraFeeAmount: number; totalFeeAmount: number; entryCount: number } {
  const safe = Math.max(1, Math.floor(entryCount));
  const baseFeeAmount = Math.floor(teamBaseFee);
  const extraFeeAmount = Math.max(0, safe - 1) * Math.floor(extraTeamFee);
  return {
    entryCount: safe,
    baseFeeAmount,
    extraFeeAmount,
    totalFeeAmount: baseFeeAmount + extraFeeAmount,
  };
}

/** 수동 수입(원장) — 출처 유형 */
export type FederationIncomeSourceType =
  | "membership_fee"
  | "competition_fee"
  | "subsidy"
  | "sponsorship"
  | "registration_fee"
  | "donation"
  | "other";

export const FEDERATION_INCOME_SOURCE_LABELS: Record<FederationIncomeSourceType, string> = {
  membership_fee: "정기 회비",
  competition_fee: "대회 참가비",
  subsidy: "관 지원금",
  sponsorship: "업체 후원금",
  registration_fee: "협회 가입비",
  donation: "회원 찬조금",
  other: "기타",
};

export type FederationIncomeStatus = "expected" | "pending" | "paid";

export type FederationIncomePayerType = "team" | "individual" | "sponsor" | "organization";

export type CreateFederationIncomeInput = {
  amount: number;
  sourceType: FederationIncomeSourceType;
  payerName?: string;
  payerType?: FederationIncomePayerType;
  status: FederationIncomeStatus;
  /** 현금·통장·카드 등 (paid·미수 모두 기록) */
  paymentMethod: FederationIncomePaymentMethod;
  /** paymentMethod === bank_transfer 일 때 선택 통장 식별자(협회 내부 코드) */
  bankAccountId?: string | null;
  /** 입금 완료 시 필수 권장. 예정·대기 시 정렬·표시용(없으면 예정일 또는 오늘) */
  occurredAt?: string;
  expectedAt?: string;
  competitionId?: string | null;
  description?: string;
  /** sourceType === subsidy 이면 서버에서 true 고정. 그 외에는 저장하지 않음 */
  fundSource?: string;
  fundPurpose?: string;
  reportRequired?: boolean;
  skipDuplicateCheck?: boolean;
};

/** 협회 원장 federations/{slug}/transactions — CF·수동 지출 등 */
export type FederationLedgerTxType = "income" | "expense";

/** 회계 트랙 — 일반 vs 관 지원금(한정). `domain`(program/competition 등)과 별개 */
export type FederationAccountingLedgerDomain = "general" | "restricted_fund";

/** 지출 카테고리 코드 — 원장 category 필드에 그대로 저장 (통계·오타 방지) */
export type FederationExpenseCategory =
  | "referee"
  | "equipment"
  | "event_cost"
  | "transport"
  | "uniform"
  | "marketing"
  | "other";

export const FEDERATION_EXPENSE_CATEGORY_LABELS: Record<FederationExpenseCategory, string> = {
  referee: "심판비",
  equipment: "장비·시설",
  event_cost: "행사·접대",
  transport: "교통·운반",
  uniform: "유니폼·용품",
  marketing: "홍보·인쇄",
  other: "기타",
};

const EXPENSE_CATEGORY_KEYS = new Set<string>(Object.keys(FEDERATION_EXPENSE_CATEGORY_LABELS));

export function isFederationExpenseCategory(s: string): s is FederationExpenseCategory {
  return EXPENSE_CATEGORY_KEYS.has(s);
}

/** 관 지원금(한정) 지출 — 보고·집계용 용도 프리셋 (직접 입력 병행 가능) */
export const FEDERATION_RESTRICTED_EXPENSE_PURPOSE_PRESETS = [
  "장비 구매",
  "심판비",
  "대회 운영",
  "시설·임대",
  "교통·숙박",
  "홍보·인쇄",
  "기타",
] as const;

export function expenseCategoryLabel(category: string): string {
  return isFederationExpenseCategory(category)
    ? FEDERATION_EXPENSE_CATEGORY_LABELS[category]
    : category || "—";
}

/** 대회 미연결 지출의 domain (firestore.rules 의 fedOpTxDomain 허용 목록) */
export type FederationExpenseOperatingDomain = "program" | "event" | "league";

/** 지출 결제 수단 (영수증·수기 공통, 카드 승인 연동 전 단계) */
export type FederationExpensePaymentMethod = "card" | "cash" | "bank_transfer" | "other";

/** 수입 입금 경로 — 지출과 동일 코드 */
export type FederationIncomePaymentMethod = FederationExpensePaymentMethod;

export type FederationExpenseEntrySource = "manual" | "receipt_ai";

export type CreateFederationExpenseInput = {
  amount: number;
  occurredAt: string;
  category: FederationExpenseCategory;
  memo?: string;
  /** true 이면 ledgerDomain = restricted_fund (지원금 트랙 전용) */
  restrictedFund?: boolean;
  /** 지원금 트랙 지출 시 구조화 용도 (보고·감사·AI 집계) */
  fundPurpose?: string;
  /** 입금 완료된 수동 지원금 수입 원장 문서 ID — 수입과 지출 추적 */
  relatedFundIncomeId?: string;
  /** 지원금 트랙 지출 시 어떤 재원인지 (감사·보고용) */
  relatedFundSource?: string;
  /** 있으면 domain 은 competition 으로 고정, 원장에 competitionId 저장 → 대회 손익 집계 */
  competitionId?: string | null;
  operatingDomain?: FederationExpenseOperatingDomain;
  paymentMethod?: FederationExpensePaymentMethod;
  merchantName?: string;
  receiptImageUrl?: string;
  receiptRawText?: string;
  /** 0~1, AI·분석 신뢰도 */
  receiptConfidence?: number;
  receiptAnalyzed?: boolean;
  source?: FederationExpenseEntrySource;
  /** true 이면 서버·클라이언트 중복 검사를 건너뜀 (Callable에 그대로 전달) */
  skipDuplicateCheck?: boolean;
};

export interface FederationLedgerTransaction {
  id: string;
  type: FederationLedgerTxType;
  domain: string;
  /** 회계 분기 — 미기록 시 파싱 단계에서 general 로 간주 */
  ledgerDomain: FederationAccountingLedgerDomain;
  category: string;
  amount: number;
  /** expected/청구 기준 금액 대비 누적 입금액 (expected 계열 수입에서 사용) */
  paidAmount?: number;
  /** expected/청구 기준 잔액 (expected 계열 수입에서 사용) */
  remainingAmount?: number;
  occurredAt: string;
  paidAt?: string;
  relatedRef?: { kind: string; id: string };
  memo?: string | null;
  createdByUid: string;
  /** 수동 지출만. 대회 필터 시 손익 집계에 사용 */
  competitionId?: string;
  paymentMethod?: FederationExpensePaymentMethod;
  merchantName?: string;
  receiptImageUrl?: string;
  receiptRawText?: string;
  receiptConfidence?: number;
  receiptAnalyzed?: boolean;
  source?: FederationExpenseEntrySource;
  /** Callable 수동 수입 원장 */
  manualIncome?: boolean;
  incomeSourceType?: FederationIncomeSourceType;
  incomeStatus?: FederationIncomeStatus;
  payerName?: string;
  payerType?: FederationIncomePayerType;
  expectedAt?: string;
  /** 수입 입금 경로(수동 수입) */
  bankAccountId?: string;
  /** 관 지원금 등 한정성 기금 여부 */
  isRestrictedFund?: boolean;
  fundSource?: string;
  /** 수입(지원금): 기금 취지 / 지출(한정 트랙): 집행 용도 */
  fundPurpose?: string;
  reportRequired?: boolean;
  /** 지출: 지원금 한정 집행 여부 */
  restrictedFund?: boolean;
  /** 지출: 지원금 트랙일 때 재원 메모 */
  relatedFundSource?: string;
  /** 지출: 연결된 수동 지원금 수입 원장 ID */
  relatedFundIncomeId?: string;
}

export function isFederationIncomePaidForLedger(tx: FederationLedgerTransaction): boolean {
  if (tx.type !== "income") return false;
  if (!tx.manualIncome) return true;
  return tx.incomeStatus === "paid";
}

export function isFederationIncomeReceivable(tx: FederationLedgerTransaction): boolean {
  return (
    tx.type === "income" &&
    tx.manualIncome === true &&
    (tx.incomeStatus === "expected" || tx.incomeStatus === "pending")
  );
}

export function federationIncomeSourceLabel(t?: FederationIncomeSourceType): string {
  if (!t) return "—";
  return FEDERATION_INCOME_SOURCE_LABELS[t] ?? t;
}

/** 지원금(한정) 회계 트랙 여부 — 수입·지출 공통 */
export function isRestrictedAccountingLedger(tx: FederationLedgerTransaction): boolean {
  return tx.ledgerDomain === "restricted_fund";
}

/** @deprecated 호환용 — restricted 트랙 수입 */
export function isFederationSubsidyRestrictedIncome(tx: FederationLedgerTransaction): boolean {
  return tx.type === "income" && tx.ledgerDomain === "restricted_fund";
}

/** competitionEntries 문서 ID `${competitionId}__${teamId}` 에서 대회 ID 추출 */
export function competitionIdFromEntryDocId(entryDocId: string): string | null {
  const i = entryDocId.indexOf("__");
  if (i <= 0) return null;
  return entryDocId.slice(0, i);
}
