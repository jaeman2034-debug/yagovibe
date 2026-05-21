/**
 * 협회 회계 AI 요약 — Cloud Callable summarizeFederationAccounting
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type FederationAccountingSummaryStats = {
  income: number;
  /** 수동 원장 미수(expected+pending) 합계 — 있으면 요약에 반영 가능 */
  receivableIncome?: number;
  expense: number;
  balance: number;
  incomeByBucket: Record<string, number>;
  expenseByCategory: Record<string, number>;
  rowCount: number;
  expenseEntryBreakdown?: {
    expenseTotalCount: number;
    receiptAiCount: number;
    manualCount: number;
    withReceiptImageCount: number;
    avgAmountReceiptAi: number | null;
    avgAmountManual: number | null;
  } | null;
  /** 대시보드 필터와 동일 원장으로 산출. 거래 5건 미만이면 생략 */
  anomalyHints?: {
    comparisonPeriodLabel: string;
    countsByKind?: {
      high_amount: number;
      repeated_merchant: number;
      category_spike: number;
    };
    items: Array<
      | {
          kind: "high_amount";
          severity: "low" | "medium" | "high";
          occurredAt: string;
          amount: number;
          categoryLabel: string;
          merchantName?: string;
          ratio: number;
          baselineLabel: string;
        }
      | {
          kind: "repeated_merchant";
          severity: "low" | "medium" | "high";
          displayName: string;
          count: number;
          totalAmount: number;
        }
      | {
          kind: "category_spike";
          severity: "low" | "medium" | "high";
          categoryLabel: string;
          current: number;
          prior: number;
          ratio: number;
        }
    >;
  } | null;
};

export type FederationAccountingSummaryTx = {
  type: "income" | "expense";
  domain: string;
  category: string;
  amount: number;
  occurredAt: string;
  competitionId?: string;
  memo?: string;
};

export type FederationAccountingComparisonStats = {
  label: string;
  income: number;
  expense: number;
  balance: number;
  rowCount: number;
};

/** 클라이언트 산출 — LLM에 전달해 추측 대신 규칙 기반 신호 사용 */
export type FederationAccountingSignals = {
  expenseIncreaseVsPrior: number | null;
  incomeChangeVsPrior: number | null;
  anomalyExpenseSpike: boolean;
  anomalyIncomeDrop: boolean;
  topExpenses: { label: string; amount: number; pctOfTotalExpense: number }[];
  topIncomes: { label: string; amount: number; pctOfTotalIncome: number }[];
  trustLevel: "high" | "medium" | "low";
  trustReason: string;
  ledgerSampleCap: number;
  ledgerRowCountSubscribed: number;
};

export async function requestFederationAccountingSummary(input: {
  federationSlug: string;
  filterContext: string;
  stats: FederationAccountingSummaryStats;
  transactions: FederationAccountingSummaryTx[];
  comparison?: FederationAccountingComparisonStats | null;
  signals?: FederationAccountingSignals | null;
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const fn = httpsCallable<
    typeof input,
    { ok?: boolean; summary?: string; error?: string }
  >(functions, "summarizeFederationAccounting");

  const res = await fn(input);
  const data = res.data;
  if (data?.ok === true && typeof data.summary === "string" && data.summary.trim()) {
    return { ok: true, summary: data.summary.trim() };
  }
  return { ok: false, error: String(data?.error || "요약에 실패했습니다.") };
}

export async function requestFederationAccountingAnswer(input: {
  federationSlug: string;
  filterContext: string;
  question: string;
  stats: FederationAccountingSummaryStats;
  transactions: FederationAccountingSummaryTx[];
  comparison?: FederationAccountingComparisonStats | null;
  signals?: FederationAccountingSignals | null;
}): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  const fn = httpsCallable<
    typeof input,
    { ok?: boolean; answer?: string; error?: string }
  >(functions, "askFederationAccounting");

  const res = await fn(input);
  const data = res.data;
  if (data?.ok === true && typeof data.answer === "string" && data.answer.trim()) {
    return { ok: true, answer: data.answer.trim() };
  }
  return { ok: false, error: String(data?.error || "질문 응답에 실패했습니다.") };
}
