/**
 * 협회 회계 대시보드용 — 규칙 기반 지출 이상 힌트 (클라이언트 1차)
 */

import type { FederationLedgerTransaction } from "@/types/federationOperating";
import { expenseCategoryLabel } from "@/types/federationOperating";

export function normalizeExpenseMerchantKey(s?: string): string {
  let t = String(s || "").trim().toLowerCase();
  t = t.replace(/\s+/g, "");
  t = t.replace(/\(주\)|㈜|주식회사|\(유\)|유한회사/g, "");
  t = t.replace(/점|지점/g, "");
  t = t.replace(/-/g, "");
  return t;
}

export type ExpenseAnomalyFlag = "HIGH_AMOUNT" | "REPEATED_MERCHANT";

export type AnomalyHintSeverity = "low" | "medium" | "high";

const SEV_RANK: Record<AnomalyHintSeverity, number> = { low: 1, medium: 2, high: 3 };

export function severityHighAmount(ratio: number): AnomalyHintSeverity {
  if (ratio >= 3) return "high";
  return "medium";
}

export function severityRepeatedMerchant(count: number): AnomalyHintSeverity {
  if (count >= 5) return "high";
  if (count >= 4) return "medium";
  return "low";
}

export function severityCategorySpike(ratio: number): AnomalyHintSeverity {
  if (ratio >= 2) return "high";
  return "medium";
}

function upsertTxSeverity(map: Map<string, AnomalyHintSeverity>, txId: string, sev: AnomalyHintSeverity) {
  const prev = map.get(txId);
  if (!prev || SEV_RANK[sev] > SEV_RANK[prev]) map.set(txId, sev);
}

export type AnomalyCountsByKind = {
  high_amount: number;
  repeated_merchant: number;
  category_spike: number;
};

export type HighAmountHint = {
  txId: string;
  occurredAt: string;
  amount: number;
  merchantName?: string;
  categoryLabel: string;
  ratio: number;
  baselineLabel: string;
  severity: AnomalyHintSeverity;
};

export type RepeatedMerchantHint = {
  key: string;
  displayName: string;
  count: number;
  totalAmount: number;
  txIds: string[];
  severity: AnomalyHintSeverity;
};

export type CategorySpikeHint = {
  categoryLabel: string;
  current: number;
  prior: number;
  ratio: number;
  severity: AnomalyHintSeverity;
};

export type ExpenseAnomalyHints = {
  highAmount: HighAmountHint[];
  repeatedMerchants: RepeatedMerchantHint[];
  categorySpikes: CategorySpikeHint[];
  flagsByTxId: Map<string, Set<ExpenseAnomalyFlag>>;
  /** 기간 내 해당 유형 건수(고액=건, 반복=상호 그룹 수, 급증=카테고리 수) — AI 압축 요약용 */
  countsByKind: AnomalyCountsByKind;
  /** 지출 건 단위 최고 severity (고액·반복만; 카테고리 급증은 미포함) */
  severityByTxId: Map<string, AnomalyHintSeverity>;
  /** 최종 심각도가 `high`인 지출 건수 (고액·반복 힌트 기준) */
  highSeverityExpenseCount: number;
  /** 심각도 `high`인 카테고리 급증 항목 수 */
  highSeverityCategorySpikeCount: number;
  hasAny: boolean;
};

const MIN_HIGH_AMOUNT_WON = 20_000;
const HIGH_AMOUNT_MULT = 2;
const REPEAT_MERCHANT_MIN = 3;
const SPIKE_MULT = 1.5;
const SPIKE_MIN_CURRENT = 50_000;
const SPIKE_MIN_PRIOR = 30_000;

function expenseRows(rows: FederationLedgerTransaction[]): FederationLedgerTransaction[] {
  return rows.filter((tx) => tx.type === "expense");
}

/**
 * @param filteredAll 필터·범위가 적용된 원장 전체 (수입+지출)
 */
export function buildExpenseAnomalyHints(
  filteredAll: FederationLedgerTransaction[],
  opts: {
    avgAmountReceiptAi: number | null;
    avgAmountManual: number | null;
    expenseByCategoryTotals: Record<string, number>;
    priorExpenseByCategoryTotals: Record<string, number>;
  }
): ExpenseAnomalyHints {
  const expenses = expenseRows(filteredAll);
  const flagsByTxId = new Map<string, Set<ExpenseAnomalyFlag>>();
  const severityByTxId = new Map<string, AnomalyHintSeverity>();

  const addFlag = (txId: string, f: ExpenseAnomalyFlag) => {
    let s = flagsByTxId.get(txId);
    if (!s) {
      s = new Set();
      flagsByTxId.set(txId, s);
    }
    s.add(f);
  };

  let sumAll = 0;
  for (const tx of expenses) sumAll += Math.max(0, tx.amount);
  const combinedAvg = expenses.length > 0 ? Math.round(sumAll / expenses.length) : null;

  const highAmount: HighAmountHint[] = [];
  for (const tx of expenses) {
    const amount = Math.max(0, tx.amount);
    if (amount < MIN_HIGH_AMOUNT_WON) continue;

    const baseline =
      tx.source === "receipt_ai"
        ? opts.avgAmountReceiptAi ?? combinedAvg
        : opts.avgAmountManual ?? combinedAvg;

    if (baseline == null || baseline <= 0) continue;
    if (amount <= baseline * HIGH_AMOUNT_MULT) continue;

    const ratio = Math.round((amount / baseline) * 10) / 10;
    const baselineLabel =
      tx.source === "receipt_ai"
        ? opts.avgAmountReceiptAi != null
          ? "AI 등록 건 평균"
          : "기간 지출 평균"
        : opts.avgAmountManual != null
          ? "수기 건 평균"
          : "기간 지출 평균";

    const severity = severityHighAmount(ratio);
    highAmount.push({
      txId: tx.id,
      occurredAt: tx.occurredAt || "",
      amount,
      merchantName: tx.merchantName?.trim() || undefined,
      categoryLabel: expenseCategoryLabel(tx.category),
      ratio,
      baselineLabel,
      severity,
    });
    addFlag(tx.id, "HIGH_AMOUNT");
    upsertTxSeverity(severityByTxId, tx.id, severity);
  }

  highAmount.sort((a, b) => b.amount - a.amount);
  const highAmountTop = highAmount.slice(0, 8);

  const merchantBuckets = new Map<
    string,
    { displayName: string; count: number; total: number; txIds: string[] }
  >();

  for (const tx of expenses) {
    const key = normalizeExpenseMerchantKey(tx.merchantName);
    if (!key) continue;
    const display = (tx.merchantName || "").trim() || key;
    const prev = merchantBuckets.get(key);
    const amt = Math.max(0, tx.amount);
    if (prev) {
      prev.count += 1;
      prev.total += amt;
      prev.txIds.push(tx.id);
      if (display.length > prev.displayName.length) prev.displayName = display;
    } else {
      merchantBuckets.set(key, { displayName: display, count: 1, total: amt, txIds: [tx.id] });
    }
  }

  const repeatedMerchants: RepeatedMerchantHint[] = [];
  for (const [key, v] of merchantBuckets) {
    if (v.count < REPEAT_MERCHANT_MIN) continue;
    const severity = severityRepeatedMerchant(v.count);
    repeatedMerchants.push({
      key,
      displayName: v.displayName,
      count: v.count,
      totalAmount: v.total,
      txIds: v.txIds,
      severity,
    });
    for (const id of v.txIds) {
      addFlag(id, "REPEATED_MERCHANT");
      upsertTxSeverity(severityByTxId, id, severity);
    }
  }
  repeatedMerchants.sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);

  const categorySpikes: CategorySpikeHint[] = [];
  for (const [categoryLabel, current] of Object.entries(opts.expenseByCategoryTotals)) {
    if (current < SPIKE_MIN_CURRENT) continue;
    const prior = opts.priorExpenseByCategoryTotals[categoryLabel] ?? 0;
    if (prior < SPIKE_MIN_PRIOR) continue;
    if (current <= prior * SPIKE_MULT) continue;
    const ratio = Math.round((current / prior) * 10) / 10;
    categorySpikes.push({
      categoryLabel,
      current,
      prior,
      ratio,
      severity: severityCategorySpike(ratio),
    });
  }
  categorySpikes.sort((a, b) => b.ratio - a.ratio);

  const countsByKind: AnomalyCountsByKind = {
    high_amount: highAmount.length,
    repeated_merchant: repeatedMerchants.length,
    category_spike: categorySpikes.length,
  };

  const hasAny =
    highAmountTop.length > 0 || repeatedMerchants.length > 0 || categorySpikes.length > 0;

  let highSeverityExpenseCount = 0;
  for (const sev of severityByTxId.values()) {
    if (sev === "high") highSeverityExpenseCount++;
  }

  const highSeverityCategorySpikeCount = categorySpikes.filter((s) => s.severity === "high").length;

  return {
    highAmount: highAmountTop,
    repeatedMerchants,
    categorySpikes,
    flagsByTxId,
    countsByKind,
    severityByTxId,
    highSeverityExpenseCount,
    highSeverityCategorySpikeCount,
    hasAny,
  };
}

/** AI 요약·질의용 — 필터 구간 거래 건수 부족 시 null (노이즈 억제) */
export const MIN_FILTERED_TX_FOR_ANOMALY_AI = 5;

export type AnomalyHintForAi =
  | {
      kind: "high_amount";
      severity: AnomalyHintSeverity;
      occurredAt: string;
      amount: number;
      categoryLabel: string;
      merchantName?: string;
      ratio: number;
      baselineLabel: string;
    }
  | {
      kind: "repeated_merchant";
      severity: AnomalyHintSeverity;
      displayName: string;
      count: number;
      totalAmount: number;
    }
  | {
      kind: "category_spike";
      severity: AnomalyHintSeverity;
      categoryLabel: string;
      current: number;
      prior: number;
      ratio: number;
    };

export type ExpenseAnomalyHintsForAi = {
  comparisonPeriodLabel: string;
  countsByKind: AnomalyCountsByKind;
  items: AnomalyHintForAi[];
};

/**
 * 대시보드·AI가 동일 필터를 쓰도록 `filteredRowCount`는 filteredTx.length 와 맞출 것.
 */
export function toExpenseAnomalyHintsForAi(
  hints: ExpenseAnomalyHints,
  comparisonPeriodLabel: string,
  opts: { filteredRowCount: number }
): ExpenseAnomalyHintsForAi | null {
  if (opts.filteredRowCount < MIN_FILTERED_TX_FOR_ANOMALY_AI) return null;
  if (!hints.hasAny) return null;

  const items: AnomalyHintForAi[] = [];

  for (const h of hints.highAmount) {
    items.push({
      kind: "high_amount",
      severity: h.severity,
      occurredAt: (h.occurredAt || "").slice(0, 10),
      amount: h.amount,
      categoryLabel: h.categoryLabel,
      ratio: h.ratio,
      baselineLabel: h.baselineLabel,
      ...(h.merchantName ? { merchantName: h.merchantName } : {}),
    });
  }

  for (const r of hints.repeatedMerchants.slice(0, 8)) {
    items.push({
      kind: "repeated_merchant",
      severity: r.severity,
      displayName: r.displayName,
      count: r.count,
      totalAmount: r.totalAmount,
    });
  }

  for (const s of hints.categorySpikes.slice(0, 6)) {
    items.push({
      kind: "category_spike",
      severity: s.severity,
      categoryLabel: s.categoryLabel,
      current: s.current,
      prior: s.prior,
      ratio: s.ratio,
    });
  }

  if (items.length === 0) return null;

  return {
    comparisonPeriodLabel,
    countsByKind: hints.countsByKind,
    items,
  };
}
