/**
 * 회계 리포트 인쇄/PDF용 데이터 모델.
 * 실제 HTML 생성은 `@/utils/federationAccountingPdf`에서 수행합니다.
 */

export type FederationAccountingReportTx = {
  occurredAt: string;
  type: "income" | "expense";
  domain: string;
  category: string;
  amount: number;
  memo?: string;
};

/** 인쇄/PDF용 지원금(restricted_fund) 전용 구간 */
export interface FederationSubsidyReportPrint {
  filterLabel: string;
  paidIn: number;
  restrictedExpense: number;
  balance: number;
  usagePct: number | null;
  /** 미연결 지출 유무 */
  auditStatus: "ok" | "unlinked";
  purposeRows: Array<{ label: string; amount: number }>;
  expenseRows: Array<{
    occurredAt: string;
    fundPurpose: string;
    categoryLabel: string;
    amount: number;
    linkedCaption: string;
    memo: string;
  }>;
  unlinkedRows: Array<{ occurredAt: string; amount: number; memo: string }>;
  incomeRows: Array<{
    occurredAt: string;
    fundSource: string;
    fundPurpose: string;
    amount: number;
    statusLabel: string;
    ledgerIdShort: string;
  }>;
}

export interface FederationAccountingReportPrintProps {
  federationName: string;
  federationSlug: string;
  filterLabel: string;
  generatedAt: string;

  totalIncome: number;
  totalExpense: number;
  balance: number;

  incomeBuckets: Array<{ label: string; amount: number }>;

  unpaidTeamCount: number;
  unpaidCompetitionEntryCount: number;

  /** 월별 표 기준 연도 (차트와 동일: 필터 연도) */
  monthlyTableYear: number;

  /** 인쇄용 월별 표 (차트 대신) */
  monthlyRows: Array<{
    monthLabel: string;
    income: number;
    expense: number;
    cumulativeBalance: number;
  }>;

  recentTransactions: FederationAccountingReportTx[];

  /** 지원금 회계 보고서 블록 (restricted_fund, 필터 구간) */
  subsidyReport: FederationSubsidyReportPrint;

  aiSummary?: string;

  /** 원장 구독 한도 등 안내 */
  ledgerNote?: string;
}
