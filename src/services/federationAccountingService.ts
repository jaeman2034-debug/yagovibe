/**
 * 협회 회계 원장 조회·지출 등록 — federations/{slug}/transactions
 */

import { collection, getDocs, limit, onSnapshot, orderBy, query, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { db, functions, storage } from "@/lib/firebase";
import type {
  CreateFederationExpenseInput,
  CreateFederationIncomeInput,
  FederationAccountingLedgerDomain,
  FederationExpenseOperatingDomain,
  FederationExpensePaymentMethod,
  FederationIncomePaymentMethod,
  FederationIncomePayerType,
  FederationIncomeSourceType,
  FederationIncomeStatus,
  FederationLedgerTransaction,
  FederationLedgerTxType,
} from "@/types/federationOperating";
import { FEDERATION_INCOME_SOURCE_LABELS } from "@/types/federationOperating";

const FED_INCOME_SOURCE_KEYS = new Set<string>(Object.keys(FEDERATION_INCOME_SOURCE_LABELS));
const FED_INCOME_PAYER_TYPES = new Set<FederationIncomePayerType>(["team", "individual", "sponsor", "organization"]);

const COL = "transactions" as const;

const PAYMENT_METHODS = new Set<FederationExpensePaymentMethod>(["card", "cash", "bank_transfer", "other"]);

function parsePaymentMethod(v: unknown): FederationExpensePaymentMethod | undefined {
  if (v === "card" || v === "cash" || v === "bank_transfer" || v === "other") return v;
  return undefined;
}

function fedTransactionsCol(federationSlug: string) {
  return collection(db, "federations", federationSlug, COL);
}

export type PotentialDuplicateExpense = {
  id: string;
  occurredAt: string;
  amount: number;
  merchantName?: string;
};

/**
 * 중복 탐지·유사 상호 비교용 (표시용 merchantName 은 그대로 저장)
 * — 법인 표기·지점·공백·하이픈 차이 흡수
 */
function normalizeMerchantKey(s?: string): string {
  let t = String(s || "").trim().toLowerCase();
  t = t.replace(/\s+/g, "");
  t = t.replace(/\(주\)|㈜|주식회사|\(유\)|유한회사/g, "");
  t = t.replace(/점|지점/g, "");
  t = t.replace(/-/g, "");
  return t;
}

function merchantsLikelySame(a: string, b: string): boolean {
  if (!a && !b) return true;
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

function sameCalendarDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

function withinDays(isoTx: string, isoTarget: string, days: number): boolean {
  const tx = new Date(isoTx);
  const t = new Date(isoTarget);
  if (Number.isNaN(tx.getTime()) || Number.isNaN(t.getTime())) return false;
  const diff = Math.abs(tx.getTime() - t.getTime()) / 86400000;
  return diff <= days;
}

/**
 * 최근 원장에서 동일·유사 지출 가능성 검사 (금액 동일 + 날짜 ±1일 + 상호 유사).
 * 상호가 모두 비어 있으면 **같은 달력일**만 매칭해 오탐을 줄입니다.
 * occurredAt 은 저장 시 `YYYY-MM-DD` 로컬 기준 정오 → ISO 로 통일된 값과 비교합니다.
 */
export async function findPotentialDuplicateExpenses(
  federationSlug: string,
  params: { occurredAtIso: string; amount: number; merchantName?: string }
): Promise<PotentialDuplicateExpense[]> {
  const qy = query(fedTransactionsCol(federationSlug), orderBy("occurredAt", "desc"), limit(220));
  const snap = await getDocs(qy);
  const targetMerchant = normalizeMerchantKey(params.merchantName);
  const out: PotentialDuplicateExpense[] = [];

  for (const d of snap.docs) {
    const tx = parseLedgerTx(d.id, d.data() as Record<string, unknown>);
    if (tx.type !== "expense") continue;
    if (tx.amount !== params.amount) continue;

    const exM = normalizeMerchantKey(tx.merchantName);
    const bothBlank = !targetMerchant && !exM;
    if (bothBlank) {
      if (!sameCalendarDay(tx.occurredAt, params.occurredAtIso)) continue;
    } else {
      if (!withinDays(tx.occurredAt, params.occurredAtIso, 1)) continue;
      if (!merchantsLikelySame(targetMerchant, exM)) continue;
    }

    out.push({
      id: tx.id,
      occurredAt: tx.occurredAt,
      amount: tx.amount,
      merchantName: tx.merchantName,
    });
  }

  return out;
}

export type PotentialDuplicateIncome = {
  id: string;
  occurredAt: string;
  amount: number;
  payerName?: string;
};

function refDateForIncomeDupClient(tx: FederationLedgerTransaction): string {
  return (tx.occurredAt || "").trim() || (tx.expectedAt || "").trim() || "";
}

/**
 * 최근 원장에서 유사 수동 수입 가능성 검사 (금액 동일 + 날짜 ±1일 + 납부자명 유사).
 * 납부자명이 모두 비어 있으면 같은 달력일만 매칭합니다.
 */
export async function findPotentialDuplicateIncomes(
  federationSlug: string,
  params: { refIso: string; amount: number; payerName?: string }
): Promise<PotentialDuplicateIncome[]> {
  const qy = query(fedTransactionsCol(federationSlug), orderBy("occurredAt", "desc"), limit(220));
  const snap = await getDocs(qy);
  const targetP = normalizeMerchantKey(params.payerName);
  const out: PotentialDuplicateIncome[] = [];

  for (const d of snap.docs) {
    const tx = parseLedgerTx(d.id, d.data() as Record<string, unknown>);
    if (tx.type !== "income" || !tx.manualIncome) continue;
    if (tx.amount !== params.amount) continue;

    const exRef = refDateForIncomeDupClient(tx);
    if (!exRef || !params.refIso) continue;

    const exP = normalizeMerchantKey(tx.payerName);
    const bothBlank = !targetP && !exP;
    if (bothBlank) {
      if (!sameCalendarDay(tx.occurredAt || exRef, params.refIso)) continue;
    } else {
      if (!withinDays(exRef, params.refIso, 1)) continue;
      if (!merchantsLikelySame(targetP, exP)) continue;
    }

    out.push({
      id: tx.id,
      occurredAt: tx.occurredAt || exRef,
      amount: tx.amount,
      payerName: tx.payerName,
    });
  }

  return out;
}

/** 협회 지출 영수증 이미지 — Storage `federations/{slug}/expenseReceipts/{uid}/...` */
export async function uploadFederationExpenseReceiptImage(federationSlug: string, file: File): Promise<string> {
  const asset = await uploadFederationExpenseReceiptImageAsset(federationSlug, file);
  return asset.downloadURL;
}

export type FederationExpenseReceiptAsset = {
  storagePath: string;
  downloadURL: string;
};

/** 협회 지출 영수증 이미지 업로드 + 경로/URL 반환 (OCR은 storagePath 우선) */
export async function uploadFederationExpenseReceiptImageAsset(
  federationSlug: string,
  file: File
): Promise<FederationExpenseReceiptAsset> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const path = `federations/${federationSlug}/expenseReceipts/${uid}/${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
  const downloadURL = await getDownloadURL(r);
  return { storagePath: path, downloadURL };
}

function parseLedgerTx(id: string, raw: Record<string, unknown>): FederationLedgerTransaction {
  const t = String(raw.type || "");
  const type: FederationLedgerTxType = t === "expense" ? "expense" : "income";
  let relatedRef: { kind: string; id: string } | undefined;
  if (raw.relatedRef && typeof raw.relatedRef === "object") {
    const rr = raw.relatedRef as Record<string, unknown>;
    if (typeof rr.kind === "string" && typeof rr.id === "string") {
      relatedRef = { kind: rr.kind, id: rr.id };
    }
  }
  const competitionId =
    typeof raw.competitionId === "string" && raw.competitionId.trim() ? raw.competitionId.trim() : undefined;

  const pm = parsePaymentMethod(raw.paymentMethod);
  const receiptConfidence =
    typeof raw.receiptConfidence === "number" && Number.isFinite(raw.receiptConfidence)
      ? Math.min(1, Math.max(0, raw.receiptConfidence))
      : undefined;
  const paidAmount =
    typeof raw.paidAmount === "number" && Number.isFinite(raw.paidAmount)
      ? Math.max(0, Math.floor(raw.paidAmount))
      : undefined;
  const remainingAmount =
    typeof raw.remainingAmount === "number" && Number.isFinite(raw.remainingAmount)
      ? Math.floor(raw.remainingAmount)
      : undefined;

  let incomeSourceType: FederationIncomeSourceType | undefined;
  if (typeof raw.incomeSourceType === "string" && FED_INCOME_SOURCE_KEYS.has(raw.incomeSourceType)) {
    incomeSourceType = raw.incomeSourceType as FederationIncomeSourceType;
  }

  let incomeStatus: FederationIncomeStatus | undefined;
  if (raw.incomeStatus === "expected" || raw.incomeStatus === "pending" || raw.incomeStatus === "paid") {
    incomeStatus = raw.incomeStatus;
  }

  let payerType: FederationIncomePayerType | undefined;
  if (typeof raw.payerType === "string" && FED_INCOME_PAYER_TYPES.has(raw.payerType as FederationIncomePayerType)) {
    payerType = raw.payerType as FederationIncomePayerType;
  }

  const expectedAt =
    typeof raw.expectedAt === "string" && raw.expectedAt.trim() ? raw.expectedAt.trim() : undefined;

  const payerNameIncome =
    typeof raw.payerName === "string" && raw.payerName.trim() ? raw.payerName.trim().slice(0, 400) : undefined;

  const bankAccountId =
    typeof raw.bankAccountId === "string" && raw.bankAccountId.trim()
      ? raw.bankAccountId.trim().slice(0, 120)
      : undefined;

  const fundSource =
    typeof raw.fundSource === "string" && raw.fundSource.trim() ? raw.fundSource.trim().slice(0, 400) : undefined;
  const fundPurpose =
    typeof raw.fundPurpose === "string" && raw.fundPurpose.trim() ? raw.fundPurpose.trim().slice(0, 400) : undefined;
  const reportRequired = raw.reportRequired === false ? false : raw.reportRequired === true ? true : undefined;

  let ledgerDomain: FederationAccountingLedgerDomain = "general";
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

  return {
    id,
    type,
    domain: String(raw.domain || "").trim() || "unknown",
    ledgerDomain,
    category: String(raw.category || "").trim() || "uncategorized",
    amount: typeof raw.amount === "number" ? Math.floor(raw.amount) : 0,
    ...(paidAmount !== undefined ? { paidAmount } : {}),
    ...(remainingAmount !== undefined ? { remainingAmount } : {}),
    occurredAt: typeof raw.occurredAt === "string" && raw.occurredAt.trim() ? raw.occurredAt.trim() : "",
    ...(typeof raw.paidAt === "string" && raw.paidAt.trim() ? { paidAt: raw.paidAt.trim() } : {}),
    relatedRef,
    memo: raw.memo != null ? String(raw.memo) : null,
    createdByUid: String(raw.createdByUid || ""),
    competitionId,
    ...(pm && PAYMENT_METHODS.has(pm) ? { paymentMethod: pm } : {}),
    ...(typeof raw.merchantName === "string" && raw.merchantName.trim()
      ? { merchantName: raw.merchantName.trim().slice(0, 400) }
      : {}),
    ...(typeof raw.receiptImageUrl === "string" && raw.receiptImageUrl.trim()
      ? { receiptImageUrl: raw.receiptImageUrl.trim() }
      : {}),
    ...(typeof raw.receiptRawText === "string" && raw.receiptRawText.trim()
      ? { receiptRawText: raw.receiptRawText.slice(0, 25000) }
      : {}),
    ...(receiptConfidence !== undefined ? { receiptConfidence } : {}),
    ...(typeof raw.receiptAnalyzed === "boolean" ? { receiptAnalyzed: raw.receiptAnalyzed } : {}),
    ...(raw.source === "manual" || raw.source === "receipt_ai" ? { source: raw.source } : {}),
    ...(raw.manualIncome === true ? { manualIncome: true as const } : {}),
    ...(incomeSourceType ? { incomeSourceType } : {}),
    ...(incomeStatus ? { incomeStatus } : {}),
    ...(payerType ? { payerType } : {}),
    ...(payerNameIncome ? { payerName: payerNameIncome } : {}),
    ...(expectedAt ? { expectedAt } : {}),
    ...(bankAccountId ? { bankAccountId } : {}),
    ...(raw.isRestrictedFund === true ? { isRestrictedFund: true as const } : {}),
    ...(fundSource ? { fundSource } : {}),
    ...(fundPurpose ? { fundPurpose } : {}),
    ...(reportRequired !== undefined ? { reportRequired } : {}),
    ...(type === "expense" && raw.restrictedFund === true ? { restrictedFund: true as const } : {}),
    ...(relatedFundSource ? { relatedFundSource } : {}),
    ...(relatedFundIncomeId ? { relatedFundIncomeId } : {}),
  };
}

export type CreateFederationExpenseResult =
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateExpense[] }
  | { ok: false; error: string };

type CreateExpenseCallableReq = {
  federationSlug: string;
  skipDuplicateCheck?: boolean;
  expense: Record<string, unknown>;
};

type CreateExpenseCallableRes =
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateExpense[] }
  | { ok: false; error: string };

export async function createFederationExpenseTransaction(
  federationSlug: string,
  input: CreateFederationExpenseInput
): Promise<CreateFederationExpenseResult> {
  const auth = getAuth();
  if (!auth.currentUser?.uid) return { ok: false, error: "로그인이 필요합니다." };

  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "금액을 확인하세요." };

  const occurredAt = String(input.occurredAt || "").trim();
  if (!occurredAt) return { ok: false, error: "날짜를 입력하세요." };

  const compId = input.competitionId?.trim() || "";

  const expense: Record<string, unknown> = {
    amount,
    occurredAt,
    category: input.category,
    memo: input.memo?.trim() || null,
  };
  if (compId) expense.competitionId = compId;
  else expense.operatingDomain = normalizeExpenseOperatingDomain(input.operatingDomain);

  if (input.paymentMethod && PAYMENT_METHODS.has(input.paymentMethod)) {
    expense.paymentMethod = input.paymentMethod;
  }
  if (input.merchantName?.trim()) expense.merchantName = input.merchantName.trim().slice(0, 400);
  if (input.receiptImageUrl?.trim()) expense.receiptImageUrl = input.receiptImageUrl.trim().slice(0, 2048);
  if (input.receiptRawText != null && String(input.receiptRawText).trim()) {
    expense.receiptRawText = String(input.receiptRawText).trim().slice(0, 25000);
  }
  if (typeof input.receiptConfidence === "number" && Number.isFinite(input.receiptConfidence)) {
    expense.receiptConfidence = Math.min(1, Math.max(0, input.receiptConfidence));
  }
  if (typeof input.receiptAnalyzed === "boolean") expense.receiptAnalyzed = input.receiptAnalyzed;
  if (input.source === "manual" || input.source === "receipt_ai") expense.source = input.source;
  if (input.restrictedFund === true) expense.restrictedFund = true;
  if (input.relatedFundSource?.trim()) expense.relatedFundSource = input.relatedFundSource.trim().slice(0, 400);
  if (input.fundPurpose?.trim()) expense.fundPurpose = input.fundPurpose.trim().slice(0, 400);
  if (input.relatedFundIncomeId?.trim()) {
    expense.relatedFundIncomeId = input.relatedFundIncomeId.trim().slice(0, 120);
  }

  const fn = httpsCallable<CreateExpenseCallableReq, CreateExpenseCallableRes>(functions, "createFederationExpense");

  try {
    const res = await fn({
      federationSlug,
      skipDuplicateCheck: input.skipDuplicateCheck === true,
      expense,
    });
    const d = res.data as CreateExpenseCallableRes | undefined;
    if (d?.ok === true && typeof d.id === "string") return { ok: true, id: d.id };
    if (d?.ok === false && d.code === "POTENTIAL_DUPLICATE" && Array.isArray(d.matches)) {
      return { ok: false, code: "POTENTIAL_DUPLICATE", matches: d.matches as PotentialDuplicateExpense[] };
    }
    if (d?.ok === false && typeof d.error === "string") return { ok: false, error: d.error };
    return { ok: false, error: "저장 응답을 해석할 수 없습니다." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "저장에 실패했습니다." };
  }
}

export type CreateFederationIncomeResult =
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateIncome[] }
  | { ok: false; error: string };

type CreateIncomeCallableReq = {
  federationSlug: string;
  skipDuplicateCheck?: boolean;
  income: Record<string, unknown>;
};

type CreateIncomeCallableRes =
  | { ok: true; id: string }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateIncome[] }
  | { ok: false; code: "ERROR"; message: string };

export async function createFederationIncomeTransaction(
  federationSlug: string,
  input: CreateFederationIncomeInput
): Promise<CreateFederationIncomeResult> {
  const auth = getAuth();
  if (!auth.currentUser?.uid) return { ok: false, error: "로그인이 필요합니다." };

  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "금액을 확인하세요." };

  const income: Record<string, unknown> = {
    amount,
    sourceType: input.sourceType,
    status: input.status,
    paymentMethod: input.paymentMethod,
  };

  if (input.bankAccountId?.trim()) income.bankAccountId = input.bankAccountId.trim().slice(0, 120);
  if (input.sourceType === "subsidy") {
    if (input.fundSource?.trim()) income.fundSource = input.fundSource.trim().slice(0, 400);
    if (input.fundPurpose?.trim()) income.fundPurpose = input.fundPurpose.trim().slice(0, 400);
    if (input.reportRequired === false) income.reportRequired = false;
  }

  if (input.payerName?.trim()) income.payerName = input.payerName.trim().slice(0, 400);
  if (input.payerType) income.payerType = input.payerType;
  if (input.description?.trim()) income.description = input.description.trim().slice(0, 2000);
  if (input.competitionId?.trim()) income.competitionId = input.competitionId.trim();

  const occurredAt = String(input.occurredAt || "").trim();
  const expectedAt = String(input.expectedAt || "").trim();
  if (occurredAt) income.occurredAt = occurredAt;
  if (expectedAt) income.expectedAt = expectedAt;

  const fn = httpsCallable<CreateIncomeCallableReq, CreateIncomeCallableRes>(functions, "createFederationIncome");

  try {
    const res = await fn({
      federationSlug,
      skipDuplicateCheck: input.skipDuplicateCheck === true,
      income,
    });
    const d = res.data as CreateIncomeCallableRes | undefined;
    if (d?.ok === true && typeof d.id === "string") return { ok: true, id: d.id };
    if (d?.ok === false && d.code === "POTENTIAL_DUPLICATE" && Array.isArray(d.matches)) {
      return { ok: false, code: "POTENTIAL_DUPLICATE", matches: d.matches as PotentialDuplicateIncome[] };
    }
    if (d?.ok === false && d.code === "ERROR" && typeof d.message === "string") return { ok: false, error: d.message };
    return { ok: false, error: "저장 응답을 해석할 수 없습니다." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "저장에 실패했습니다." };
  }
}

export type ConfirmFederationIncomePaymentResult =
  | { ok: true }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateIncome[] }
  | { ok: false; error: string };

type ConfirmIncomeCallableReq = {
  federationSlug: string;
  transactionId: string;
  occurredAt: string;
  skipDuplicateCheck?: boolean;
  paymentMethod?: string;
  bankAccountId?: string;
};

type ConfirmIncomeCallableRes =
  | { ok: true }
  | { ok: false; code: "POTENTIAL_DUPLICATE"; matches: PotentialDuplicateIncome[] }
  | { ok: false; code: "ERROR"; message: string };

export async function confirmFederationIncomePayment(
  federationSlug: string,
  transactionId: string,
  occurredAtIso: string,
  options?: {
    skipDuplicateCheck?: boolean;
    paymentMethod?: FederationIncomePaymentMethod;
    bankAccountId?: string;
  }
): Promise<ConfirmFederationIncomePaymentResult> {
  const auth = getAuth();
  if (!auth.currentUser?.uid) return { ok: false, error: "로그인이 필요합니다." };

  const occurredAt = String(occurredAtIso || "").trim();
  if (!occurredAt) return { ok: false, error: "입금일을 입력하세요." };

  const fn = httpsCallable<ConfirmIncomeCallableReq, ConfirmIncomeCallableRes>(
    functions,
    "confirmFederationIncomePayment"
  );

  try {
    const res = await fn({
      federationSlug,
      transactionId,
      occurredAt,
      skipDuplicateCheck: options?.skipDuplicateCheck === true,
      ...(options?.paymentMethod ? { paymentMethod: options.paymentMethod } : {}),
      ...(options?.bankAccountId?.trim() ? { bankAccountId: options.bankAccountId.trim().slice(0, 120) } : {}),
    });
    const d = res.data as ConfirmIncomeCallableRes | undefined;
    if (d?.ok === true) return { ok: true };
    if (d?.ok === false && d.code === "POTENTIAL_DUPLICATE" && Array.isArray(d.matches)) {
      return { ok: false, code: "POTENTIAL_DUPLICATE", matches: d.matches as PotentialDuplicateIncome[] };
    }
    if (d?.ok === false && d.code === "ERROR" && typeof d.message === "string") return { ok: false, error: d.message };
    return { ok: false, error: "응답을 해석할 수 없습니다." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "처리에 실패했습니다." };
  }
}

export type BankIncomeMatchCandidate = {
  id: string;
  score: number;
  amount: number;
  payerName?: string;
  refDate: string;
};

export type AnalyzeBankTransactionResult =
  | {
      ok: true;
      amount: number | null;
      payerName: string | null;
      date: string | null;
      confidence: number;
      suggestion: "match_existing" | "create_new" | "ambiguous" | "needs_review";
      matchedTransactionId?: string;
      suggestedSourceType?: string;
      matchCandidates?: BankIncomeMatchCandidate[];
      suggestedPaymentMethod?: string;
      bankAccountIdGuess?: string | null;
      aiNotes?: string | null;
    }
  | { ok: false; error: string };

type AnalyzeBankCallableReq = { federationSlug: string; rawText: string };

export async function requestAnalyzeBankTransaction(
  federationSlug: string,
  rawText: string
): Promise<AnalyzeBankTransactionResult> {
  const auth = getAuth();
  if (!auth.currentUser?.uid) return { ok: false, error: "로그인이 필요합니다." };

  const fn = httpsCallable<AnalyzeBankCallableReq, AnalyzeBankTransactionResult>(
    functions,
    "analyzeBankTransaction"
  );

  try {
    const res = await fn({ federationSlug, rawText: rawText.trim().slice(0, 8000) });
    const d = res.data as AnalyzeBankTransactionResult | undefined;
    if (d && typeof d === "object" && "ok" in d) return d;
    return { ok: false, error: "응답을 해석할 수 없습니다." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "분석 요청에 실패했습니다." };
  }
}

export type OverdueReceivablesPreviewResult =
  | {
      scanned: number;
      dueRows: number;
      notifiedFederations: number;
      notifiedUsers: number;
      dryRun: boolean;
      federations: Array<{
        fedId: string;
        federationName: string;
        count: number;
        totalRemaining: number;
        maxOverdueDays: number;
        severity: "warning" | "critical" | "urgent";
        topTeams: Array<{ name: string; amount: number }>;
        recipientCount: number;
      }>;
    }
  | { error: string };

type TriggerOverdueNotifierReq = {
  overdueDays?: number;
  remindIntervalDays?: number;
  dryRun?: boolean;
  federationId?: string;
};

export async function requestOverdueReceivablesPreview(
  federationId: string,
  options?: { overdueDays?: number; remindIntervalDays?: number }
): Promise<OverdueReceivablesPreviewResult> {
  const auth = getAuth();
  if (!auth.currentUser?.uid) return { error: "로그인이 필요합니다." };
  const fn = httpsCallable<TriggerOverdueNotifierReq, OverdueReceivablesPreviewResult>(
    functions,
    "triggerOverdueReceivablesNotifier"
  );
  try {
    const res = await fn({
      federationId,
      dryRun: true,
      overdueDays: options?.overdueDays,
      remindIntervalDays: options?.remindIntervalDays,
    });
    const d = res.data as OverdueReceivablesPreviewResult | undefined;
    if (d && typeof d === "object") return d;
    return { error: "응답을 해석할 수 없습니다." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "미리보기를 불러오지 못했습니다." };
  }
}

function normalizeExpenseOperatingDomain(d?: FederationExpenseOperatingDomain): FederationExpenseOperatingDomain {
  if (d === "event" || d === "league") return d;
  return "program";
}

export function subscribeFederationLedgerTransactions(
  federationSlug: string,
  onData: (rows: FederationLedgerTransaction[]) => void,
  onError?: (e: Error) => void,
  options?: { maxRows?: number }
): Unsubscribe {
  const maxRows = Math.min(2000, Math.max(50, options?.maxRows ?? 800));
  const qy = query(fedTransactionsCol(federationSlug), orderBy("occurredAt", "desc"), limit(maxRows));
  return onSnapshot(
    qy,
    (snap) => onData(snap.docs.map((d) => parseLedgerTx(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}
