/** 협회 회계 AI — 클라이언트 산출 신호(요약·질의 공용) */

/** 지출 건수 기준 등록 방식·증빙 (클라이언트 필터 구간 내) */
export type ExpenseEntryBreakdownWire = {
  expenseTotalCount: number;
  receiptAiCount: number;
  manualCount: number;
  withReceiptImageCount: number;
  /** 건당 평균(원, 반올림). 건수 0이면 null — AI 요약에서 수기 대비 비교용 */
  avgAmountReceiptAi: number | null;
  avgAmountManual: number | null;
};

/** 클라이언트 규칙 기반 지출 이상 힌트 (대시보드 필터와 동일 데이터) */
export type AnomalyHintItemWire =
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
    };

export type ExpenseAnomalyHintsPayloadWire = {
  comparisonPeriodLabel: string;
  /** 유형별 건수 압축 요약용(전체 기간 기준, items는 상세 샘플). 구 클라이언트 호환 시 생략 가능 */
  countsByKind?: {
    high_amount: number;
    repeated_merchant: number;
    category_spike: number;
  };
  items: AnomalyHintItemWire[];
};

export type AccountingSummaryStatsWire = {
  income: number;
  expense: number;
  balance: number;
  incomeByBucket: Record<string, number>;
  expenseByCategory: Record<string, number>;
  rowCount: number;
  /** 있으면 요약·질의에서 지출 등록 방식(영수증 AI/수기·이미지 보유)을 한 문장으로 반영 */
  expenseEntryBreakdown?: ExpenseEntryBreakdownWire | null;
  /**
   * 규칙 기반 지출 이상 힌트. 필터 구간 거래 5건 미만이거나 해당 없으면 생략(null).
   * severity는 high일수록 요약에서 우선 언급.
   */
  anomalyHints?: ExpenseAnomalyHintsPayloadWire | null;
};

export type AccountingSummaryTxWire = {
  type: "income" | "expense";
  domain: string;
  category: string;
  amount: number;
  occurredAt: string;
  competitionId?: string;
  memo?: string;
};

export type AccountingComparisonStatsWire = {
  label: string;
  income: number;
  expense: number;
  balance: number;
  rowCount: number;
};

export type AccountingSignalsWire = {
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
