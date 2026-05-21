import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Clipboard,
  Download,
  FileText,
  MessageCircleQuestionMark,
  Printer,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FederationExpenseDialog from "./FederationExpenseDialog";
import FederationIncomeDialog from "./FederationIncomeDialog";
import FederationBankIncomeAnalyzeDialog from "./FederationBankIncomeAnalyzeDialog";
import FederationConfirmIncomeDialog from "./FederationConfirmIncomeDialog";
import {
  requestOverdueReceivablesPreview,
  subscribeFederationLedgerTransactions,
  type OverdueReceivablesPreviewResult,
} from "@/services/federationAccountingService";
import { shareOverdueReceivablesViaKakao } from "@/services/kakaoShare";
import { downloadFederationLedgerXlsx } from "@/utils/federationLedgerExport";
import {
  openAccountingReportPrintWindow,
  renderAccountingReportHtml,
  renderSubsidyOnlyReportHtml,
} from "@/utils/federationAccountingPdf";
import type { FederationSubsidyReportPrint } from "@/components/federation/accounting/FederationAccountingReportPrint";
import {
  requestFederationAccountingAnswer,
  requestFederationAccountingSummary,
} from "@/services/federationAccountingAiService";
import {
  subscribeCompetitionEntries,
  subscribeFederationCompetitions,
  subscribeFederationTeams,
  subscribeTeamFeeAccounts,
} from "@/services/federationOperatingService";
import type {
  FederationLedgerTransaction,
  FederationOperatingCompetition,
  FederationOperatingCompetitionEntry,
  FederationOperatingTeam,
  TeamFeeAccount,
} from "@/types/federationOperating";
import {
  competitionIdFromEntryDocId,
  expenseCategoryLabel,
  federationIncomeSourceLabel,
  isFederationIncomePaidForLedger,
  isFederationIncomeReceivable,
} from "@/types/federationOperating";
import {
  buildExpenseAnomalyHints,
  toExpenseAnomalyHintsForAi,
  type AnomalyHintSeverity,
} from "@/utils/federationExpenseAnomalyHints";

const LEDGER_DOMAIN_KO: Record<string, string> = {
  team_fee: "회비",
  competition: "대회",
  sponsor: "후원",
  donation: "찬조·기부",
  other: "기타",
  manual: "수동",
  unknown: "미분류",
};

/** 원장 `domain` (회비/대회/프로그램 등 운영 구분) — `ledgerDomain`(회계 트랙)과 다름 */
function operatingDomainLabel(domain: string): string {
  return LEDGER_DOMAIN_KO[domain] || domain;
}

function filterGeneralAccountingRows(rows: FederationLedgerTransaction[]): FederationLedgerTransaction[] {
  return rows.filter((tx) => tx.ledgerDomain !== "restricted_fund");
}

type Props = { federationSlug: string; federationName?: string };

type EntryDelinq = FederationOperatingCompetitionEntry & {
  competitionId: string;
  competitionName: string;
};

function occurredInPeriod(iso: string, year: number, month: number | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getFullYear() !== year) return false;
  if (month != null && d.getMonth() + 1 !== month) return false;
  return true;
}

function matchesCompetitionIncomeScope(tx: FederationLedgerTransaction, competitionId: string | null): boolean {
  if (!competitionId) return true;
  if (tx.type !== "income") return false;
  if (tx.competitionId && tx.competitionId === competitionId) return true;
  if (tx.domain === "competition") {
    const rr = tx.relatedRef;
    if (rr?.kind === "competition_entry") {
      return competitionIdFromEntryDocId(rr.id) === competitionId;
    }
  }
  return false;
}

function countedIncomeAmount(tx: FederationLedgerTransaction): number {
  if (tx.type !== "income") return 0;
  return isFederationIncomePaidForLedger(tx) ? Math.max(0, tx.amount) : 0;
}

function receivableManualIncomeAmount(tx: FederationLedgerTransaction): number {
  return isFederationIncomeReceivable(tx) ? Math.max(0, tx.amount) : 0;
}

function matchesCompetitionExpenseScope(tx: FederationLedgerTransaction, competitionId: string | null): boolean {
  if (!competitionId) return true;
  if (tx.type !== "expense") return false;
  return Boolean(tx.competitionId && tx.competitionId === competitionId);
}

function filterTxForScopeAndPeriod(
  ledger: FederationLedgerTransaction[],
  year: number,
  month: number | null,
  competitionScope: string
): FederationLedgerTransaction[] {
  const scope = competitionScope || null;
  return ledger.filter((tx) => {
    if (!occurredInPeriod(tx.occurredAt, year, month)) return false;
    if (!scope) return true;
    if (tx.type === "expense") return matchesCompetitionExpenseScope(tx, scope);
    return matchesCompetitionIncomeScope(tx, scope);
  });
}

function aggregateFromTxRows(rows: FederationLedgerTransaction[]): {
  income: number;
  receivableIncome: number;
  expense: number;
  balance: number;
  rowCount: number;
} {
  let income = 0;
  let receivableIncome = 0;
  let expense = 0;
  for (const tx of rows) {
    const a = Math.max(0, tx.amount);
    if (tx.type === "expense") expense += a;
    else {
      income += countedIncomeAmount(tx);
      receivableIncome += receivableManualIncomeAmount(tx);
    }
  }
  return { income, receivableIncome, expense, balance: income - expense, rowCount: rows.length };
}

function incomeBucket(tx: FederationLedgerTransaction): "team_fee" | "competition" | "sponsor" | "donation" | "other" {
  if (tx.type !== "income") return "other";
  if (tx.manualIncome === true && tx.incomeSourceType === "competition_fee") return "competition";
  if (tx.domain === "team_fee") return "team_fee";
  if (tx.domain === "competition") return "competition";
  if (tx.domain === "sponsor") return "sponsor";
  if (tx.domain === "donation") return "donation";
  return "other";
}

const BUCKET_LABEL: Record<string, string> = {
  team_fee: "회비",
  competition: "대회 참가비",
  sponsor: "후원금",
  donation: "찬조·기부",
  other: "기타 수입",
};

function formatAxisWon(n: number) {
  const v = Math.max(0, Math.floor(n));
  if (v >= 100_000_000) {
    const eok = v / 100_000_000;
    return `${Math.round(eok * 10) / 10}억`;
  }
  if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
  return `${v}`;
}

function daysBetweenIso(fromIso: string, toIso: string): number {
  if (!fromIso || !toIso) return 0;
  const a = new Date(fromIso);
  const b = new Date(toIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/** 원장 표 필터 — URL `ledgerView` / 별칭 `view` 와 동기화 */
type LedgerViewMode = "all" | "anomaly" | "high_focus";
type IncomeProgressFilter = "all" | "expected" | "partial" | "paid" | "overpaid";

function parseLedgerViewSearchParam(raw: string | null): LedgerViewMode {
  if (raw == null || raw === "") return "all";
  const v = raw.trim().toLowerCase();
  if (v === "all") return "all";
  if (v === "anomaly") return "anomaly";
  if (v === "high" || v === "high_focus" || v === "high-focus") return "high_focus";
  return "all";
}

function ledgerViewModeToSearchParam(mode: LedgerViewMode): string | null {
  if (mode === "all") return null;
  if (mode === "anomaly") return "anomaly";
  return "high";
}

function parseIncomeProgressSearchParam(raw: string | null): IncomeProgressFilter {
  if (raw === "expected" || raw === "partial" || raw === "paid" || raw === "overpaid") return raw;
  return "all";
}

function incomeProgressToSearchParam(mode: IncomeProgressFilter): string | null {
  if (mode === "all") return null;
  return mode;
}

function getIncomeProgressStatus(tx: FederationLedgerTransaction): Exclude<IncomeProgressFilter, "all"> | null {
  if (tx.type !== "income") return null;
  const paidAmount = Math.max(0, typeof tx.paidAmount === "number" ? tx.paidAmount : 0);
  const amount = Math.max(0, tx.amount || 0);
  if (amount > 0 && paidAmount > amount) return "overpaid";
  if (amount > 0 && paidAmount > 0 && paidAmount < amount) return "partial";
  if (tx.incomeStatus === "paid") return "paid";
  if (tx.incomeStatus === "pending") return "partial";
  return "expected";
}

function IncomeProgressBadge({ status }: { status: Exclude<IncomeProgressFilter, "all"> }) {
  if (status === "paid") {
    return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800">paid</span>;
  }
  if (status === "partial") {
    return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800">partial</span>;
  }
  if (status === "overpaid") {
    return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-violet-100 text-violet-800">overpaid</span>;
  }
  return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700">expected</span>;
}

export default function FederationAccountingDashboard({ federationSlug, federationName }: Props) {
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [competitionScope, setCompetitionScope] = useState<string>("");
  const [ledgerScope, setLedgerScope] = useState<"all" | "general" | "restricted_fund">("all");
  /** 원장: 지원금 지출 중 특정 수입 미연결 건만 (감사용) */
  const [showSubsidyUnlinkedOnly, setShowSubsidyUnlinkedOnly] = useState(false);

  const [ledger, setLedger] = useState<FederationLedgerTransaction[]>([]);
  const [ledgerErr, setLedgerErr] = useState<string | null>(null);
  const [ledgerCap, setLedgerCap] = useState(800);

  const [teams, setTeams] = useState<FederationOperatingTeam[]>([]);
  const [accounts, setAccounts] = useState<TeamFeeAccount[]>([]);
  const [competitions, setCompetitions] = useState<FederationOperatingCompetition[]>([]);
  const [delinqEntries, setDelinqEntries] = useState<EntryDelinq[]>([]);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openIncomeDialog, setOpenIncomeDialog] = useState(false);
  const [openBankIncomeAnalyze, setOpenBankIncomeAnalyze] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [overduePreview, setOverduePreview] = useState<OverdueReceivablesPreviewResult | null>(null);
  const [confirmIncomeTx, setConfirmIncomeTx] = useState<FederationLedgerTransaction | null>(null);
  const [confirmIncomePaidDate, setConfirmIncomePaidDate] = useState("");
  const [mobileSelectedReceivableIds, setMobileSelectedReceivableIds] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const ledgerViewRaw = searchParams.get("ledgerView") ?? searchParams.get("view");
  const ledgerViewMode = useMemo(() => parseLedgerViewSearchParam(ledgerViewRaw), [ledgerViewRaw]);
  const incomeProgressFilter = useMemo(
    () => parseIncomeProgressSearchParam(searchParams.get("status")),
    [searchParams]
  );

  const setLedgerViewInUrl = useCallback(
    (mode: LedgerViewMode, opts?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("ledgerView");
          next.delete("view");
          const p = ledgerViewModeToSearchParam(mode);
          if (p) next.set("ledgerView", p);
          return next;
        },
        { replace: opts?.replace ?? false }
      );
    },
    [setSearchParams]
  );
  const setIncomeProgressInUrl = useCallback(
    (mode: IncomeProgressFilter, opts?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("status");
          const p = incomeProgressToSearchParam(mode);
          if (p) next.set("status", p);
          return next;
        },
        { replace: opts?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  const federationSlugPrevRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = federationSlugPrevRef.current;
    if (prev !== undefined && prev !== federationSlug) {
      setSearchParams(
        (prevParams) => {
          if (!prevParams.has("ledgerView") && !prevParams.has("view")) return prevParams;
          const next = new URLSearchParams(prevParams);
          next.delete("ledgerView");
          next.delete("view");
          return next;
        },
        { replace: true }
      );
    }
    federationSlugPrevRef.current = federationSlug;
  }, [federationSlug, setSearchParams]);

  useEffect(() => {
    setLedgerScope("all");
  }, [federationSlug]);

  const ledgerFlowCardRef = useRef<HTMLDivElement>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiAskLoading, setAiAskLoading] = useState(false);
  const aiSummaryCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    aiSummaryCacheRef.current.clear();
    setAiSummary(null);
    setAiAnswer(null);
    setAiQuestion("");
  }, [federationSlug]);

  useEffect(() => {
    return subscribeFederationLedgerTransactions(
      federationSlug,
      (rows) => {
        setLedger(rows);
        setLedgerErr(null);
      },
      (e) => setLedgerErr(e.message),
      { maxRows: ledgerCap }
    );
  }, [federationSlug, ledgerCap]);

  useEffect(() => {
    return subscribeFederationTeams(
      federationSlug,
      (t) => setTeams(t),
      () => {}
    );
  }, [federationSlug]);

  useEffect(() => {
    return subscribeTeamFeeAccounts(
      federationSlug,
      filterYear,
      (a) => setAccounts(a),
      () => {}
    );
  }, [federationSlug, filterYear]);

  useEffect(() => {
    return subscribeFederationCompetitions(
      federationSlug,
      (c) => setCompetitions(c),
      () => {}
    );
  }, [federationSlug]);

  const competitionsRef = useRef(competitions);
  competitionsRef.current = competitions;

  const compsInYear = useMemo(
    () => competitions.filter((c) => c.year === filterYear).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [competitions, filterYear]
  );

  const compIdsForYearSig = useMemo(() => {
    return competitions
      .filter((c) => c.year === filterYear)
      .map((c) => c.id)
      .sort()
      .join("|");
  }, [competitions, filterYear]);

  const entriesMapRef = useRef<Map<string, FederationOperatingCompetitionEntry[]>>(new Map());

  useEffect(() => {
    entriesMapRef.current = new Map();
    const idList = compIdsForYearSig.split("|").filter(Boolean);
    if (!federationSlug || idList.length === 0) {
      setDelinqEntries([]);
      return;
    }
    const idSet = new Set(idList);
    const comps = competitionsRef.current
      .filter((c) => c.year === filterYear && idSet.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    const emit = () => {
      const nameById = new Map(
        competitionsRef.current.filter((c) => idSet.has(c.id)).map((c) => [c.id, c.name] as const)
      );
      const out: EntryDelinq[] = [];
      for (const c of comps) {
        const rows = entriesMapRef.current.get(c.id) || [];
        const cName = nameById.get(c.id) ?? c.name;
        for (const e of rows) {
          if (e.status !== "paid") {
            out.push({ ...e, competitionId: c.id, competitionName: cName });
          }
        }
      }
      out.sort(
        (a, b) =>
          a.competitionName.localeCompare(b.competitionName, "ko") ||
          (a.teamName || "").localeCompare(b.teamName || "", "ko") ||
          0
      );
      setDelinqEntries(out);
    };

    const unsubs = comps.map((c) =>
      subscribeCompetitionEntries(
        federationSlug,
        c.id,
        (rows) => {
          entriesMapRef.current.set(c.id, rows);
          emit();
        },
        () => {}
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [federationSlug, filterYear, compIdsForYearSig]);

  const periodScopedTx = useMemo(() => {
    const scope = competitionScope || null;
    return ledger.filter((tx) => {
      if (!occurredInPeriod(tx.occurredAt, filterYear, filterMonth)) return false;
      if (!scope) return true;
      if (tx.type === "expense") return matchesCompetitionExpenseScope(tx, scope);
      return matchesCompetitionIncomeScope(tx, scope);
    });
  }, [ledger, filterYear, filterMonth, competitionScope]);

  /** 지출 등록 시 연결 선택용 — 입금 완료된 수동 관 지원금 수입만 */
  const subsidyPaidIncomeOptions = useMemo(() => {
    return ledger
      .filter(
        (tx) =>
          tx.type === "income" &&
          tx.manualIncome === true &&
          tx.incomeSourceType === "subsidy" &&
          isFederationIncomePaidForLedger(tx)
      )
      .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""))
      .map((tx) => ({
        id: tx.id,
        label: `${tx.occurredAt?.slice(0, 10) ?? "—"} · ${tx.amount.toLocaleString("ko-KR")}원${
          tx.fundSource ? ` · ${tx.fundSource}` : ""
        }${tx.fundPurpose ? ` — ${tx.fundPurpose}` : ""}`,
      }));
  }, [ledger]);

  const generalLedgerTx = useMemo(
    () => periodScopedTx.filter((tx) => tx.ledgerDomain !== "restricted_fund"),
    [periodScopedTx]
  );

  const restrictedLedgerTx = useMemo(
    () => periodScopedTx.filter((tx) => tx.ledgerDomain === "restricted_fund"),
    [periodScopedTx]
  );

  const filteredTx = useMemo(() => {
    if (ledgerScope === "general") return generalLedgerTx;
    if (ledgerScope === "restricted_fund") return restrictedLedgerTx;
    return periodScopedTx;
  }, [ledgerScope, periodScopedTx, generalLedgerTx, restrictedLedgerTx]);

  /** AI 비교용: 월 필터 → 전월, 연간 → 전년 동일 범위(구독 원장 기준) — 일반 회계만 */
  const comparisonForAi = useMemo(() => {
    if (filterMonth != null) {
      let py = filterYear;
      let pm = filterMonth - 1;
      if (pm < 1) {
        py = filterYear - 1;
        pm = 12;
      }
      const rows = filterGeneralAccountingRows(filterTxForScopeAndPeriod(ledger, py, pm, competitionScope));
      return { label: `${py}년 ${pm}월`, ...aggregateFromTxRows(rows) };
    }
    const py = filterYear - 1;
    const rows = filterGeneralAccountingRows(filterTxForScopeAndPeriod(ledger, py, null, competitionScope));
    return { label: `${py}년(연간)`, ...aggregateFromTxRows(rows) };
  }, [ledger, filterYear, filterMonth, competitionScope]);

  /** 카테고리 급증 비교용 — comparisonForAi 와 동일 기준의 직전 기간 원장 (일반만) */
  const priorComparisonRows = useMemo(() => {
    if (filterMonth != null) {
      let py = filterYear;
      let pm = filterMonth - 1;
      if (pm < 1) {
        py = filterYear - 1;
        pm = 12;
      }
      return filterGeneralAccountingRows(filterTxForScopeAndPeriod(ledger, py, pm, competitionScope));
    }
    const py = filterYear - 1;
    return filterGeneralAccountingRows(filterTxForScopeAndPeriod(ledger, py, null, competitionScope));
  }, [ledger, filterYear, filterMonth, competitionScope]);

  const priorExpenseByCategoryTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const tx of priorComparisonRows) {
      if (tx.type !== "expense") continue;
      const k = expenseCategoryLabel(tx.category);
      m[k] = (m[k] || 0) + Math.max(0, tx.amount);
    }
    return m;
  }, [priorComparisonRows]);

  /** 월별 그래프: 연도·대회·회계 트랙 (일반/지원금 혼합 금지 — 전체 선택 시 일반만) */
  const chartSourceTx = useMemo(() => {
    const scope = competitionScope || null;
    const base = ledger.filter((tx) => {
      if (!occurredInPeriod(tx.occurredAt, filterYear, null)) return false;
      if (!scope) return true;
      if (tx.type === "expense") return matchesCompetitionExpenseScope(tx, scope);
      return matchesCompetitionIncomeScope(tx, scope);
    });
    if (ledgerScope === "restricted_fund") return base.filter((tx) => tx.ledgerDomain === "restricted_fund");
    return base.filter((tx) => tx.ledgerDomain !== "restricted_fund");
  }, [ledger, filterYear, competitionScope, ledgerScope]);

  const monthlyChartData = useMemo(() => {
    const income = Array.from({ length: 12 }, () => 0);
    const expense = Array.from({ length: 12 }, () => 0);
    for (const tx of chartSourceTx) {
      const d = new Date(tx.occurredAt);
      if (Number.isNaN(d.getTime())) continue;
      const m = d.getMonth();
      if (m < 0 || m > 11) continue;
      const amt = Math.max(0, tx.amount);
      if (tx.type === "expense") expense[m] += amt;
      else income[m] += countedIncomeAmount(tx);
    }
    let run = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const net = income[i] - expense[i];
      run += net;
      return {
        monthLabel: `${i + 1}월`,
        수입: income[i],
        지출: expense[i],
        누적잔액: run,
      };
    });
  }, [chartSourceTx]);

  const exportFilterLabel = useMemo(() => {
    const m = filterMonth != null ? `${filterMonth}월` : "연간";
    const c = competitionScope ? "대회필터" : "전체";
    const l =
      ledgerScope === "general" ? "일반회계" : ledgerScope === "restricted_fund" ? "지원금회계" : "회계전체";
    return `${filterYear}_${m}_${c}_${l}`;
  }, [filterYear, filterMonth, competitionScope, ledgerScope]);

  const handleExportXlsx = useCallback(() => {
    if (filteredTx.length === 0) {
      toast.error("다운로드할 원장이 없습니다. 필터를 조정해 보세요.");
      return;
    }
    try {
      downloadFederationLedgerXlsx(filteredTx, {
        federationSlug,
        filterLabel: exportFilterLabel,
      });
      toast.success("엑셀(.xlsx) 파일을 저장했습니다.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    }
  }, [filteredTx, federationSlug, exportFilterLabel]);

  const expenseByCategoryTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const tx of generalLedgerTx) {
      if (tx.type !== "expense") continue;
      const k = expenseCategoryLabel(tx.category);
      m[k] = (m[k] || 0) + Math.max(0, tx.amount);
    }
    return m;
  }, [generalLedgerTx]);

  const subsidyFundTotals = useMemo(() => {
    let paidIn = 0;
    let restrictedExpense = 0;
    for (const tx of restrictedLedgerTx) {
      if (tx.type === "income" && isFederationIncomePaidForLedger(tx)) {
        paidIn += Math.max(0, tx.amount);
      }
      if (tx.type === "expense") {
        restrictedExpense += Math.max(0, tx.amount);
      }
    }
    return { paidIn, restrictedExpense, balance: paidIn - restrictedExpense };
  }, [restrictedLedgerTx]);

  /** 지원금 감사: 미연결 지출·용도별 집계·미수(지원금 수입) */
  const subsidyAuditMetrics = useMemo(() => {
    const expenses = restrictedLedgerTx.filter((tx) => tx.type === "expense");
    const unlinked = expenses.filter((tx) => !tx.relatedFundIncomeId?.trim());
    const unlinkedSum = unlinked.reduce((s, tx) => s + Math.max(0, tx.amount), 0);
    const byPurpose: Record<string, number> = {};
    for (const tx of expenses) {
      const key = (tx.fundPurpose?.trim() || "(미지정)").slice(0, 120);
      byPurpose[key] = (byPurpose[key] || 0) + Math.max(0, tx.amount);
    }
    const purposeEntries = Object.entries(byPurpose).sort((a, b) => b[1] - a[1]);
    let receivableSubsidy = 0;
    for (const tx of restrictedLedgerTx) {
      if (tx.type !== "income" || tx.incomeSourceType !== "subsidy" || !tx.manualIncome) continue;
      receivableSubsidy += receivableManualIncomeAmount(tx);
    }
    const paidIn = subsidyFundTotals.paidIn;
    const usagePct = paidIn > 0 ? Math.round((subsidyFundTotals.restrictedExpense / paidIn) * 1000) / 10 : null;
    const paidIncomeRows = restrictedLedgerTx.filter(
      (tx) => tx.type === "income" && tx.manualIncome && tx.incomeSourceType === "subsidy" && isFederationIncomePaidForLedger(tx)
    );
    return {
      expenseCount: expenses.length,
      paidSubsidyIncomeCount: paidIncomeRows.length,
      unlinkedCount: unlinked.length,
      unlinkedSum,
      purposeEntries,
      receivableSubsidy,
      usagePct,
    };
  }, [restrictedLedgerTx, subsidyFundTotals]);

  useEffect(() => {
    if (ledgerScope !== "restricted_fund" && showSubsidyUnlinkedOnly) {
      setShowSubsidyUnlinkedOnly(false);
    }
  }, [ledgerScope, showSubsidyUnlinkedOnly]);

  /** 상단 4카드 = 일반 회계만 (지원금 트랙 제외) */
  const totals = useMemo(() => {
    let income = 0;
    let receivableIncome = 0;
    let expense = 0;
    const incomeBy: Record<string, number> = {
      team_fee: 0,
      competition: 0,
      sponsor: 0,
      donation: 0,
      other: 0,
    };
    for (const tx of generalLedgerTx) {
      const a = Math.max(0, tx.amount);
      if (tx.type === "expense") {
        expense += a;
        continue;
      }
      income += countedIncomeAmount(tx);
      receivableIncome += receivableManualIncomeAmount(tx);
      const cin = countedIncomeAmount(tx);
      if (cin > 0) {
        const b = incomeBucket(tx);
        incomeBy[b] = (incomeBy[b] || 0) + cin;
      }
    }
    return { income, receivableIncome, expense, balance: income - expense, incomeBy };
  }, [generalLedgerTx]);

  const collectionKpi = useMemo(() => {
    const expectedRows = periodScopedTx.filter((tx) => {
      if (tx.type !== "income") return false;
      if (tx.category !== "competition_fee") return false;
      const sourceType = String((tx as any).sourceType || "");
      return sourceType === "competition_application" || tx.id.startsWith("competition_expected_");
    });
    const nowIso = new Date().toISOString();
    let totalBilled = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let receivableCount = 0;
    let paidDaySum = 0;
    let paidDayCount = 0;
    const overdueBuckets = { under7: 0, d7_14: 0, d14_30: 0, over30: 0 };
    const byTeam = new Map<string, { name: string; amount: number }>();

    for (const tx of expectedRows) {
      const amount = Math.max(0, Math.floor(tx.amount || 0));
      const paidAmount = Math.max(0, Math.floor(typeof tx.paidAmount === "number" ? tx.paidAmount : 0));
      const refundAmount = Math.max(0, Math.floor((tx as any).refundAmount || 0));
      const netPaid = paidAmount - refundAmount;
      const remainingAmount =
        typeof tx.remainingAmount === "number" ? Math.floor(tx.remainingAmount) : amount - netPaid;
      const normalizedRemaining = Math.max(0, remainingAmount);
      totalBilled += amount;
      totalCollected += Math.max(0, netPaid);
      totalRemaining += normalizedRemaining;

      const isReceivable = normalizedRemaining > 0 && (tx.incomeStatus === "expected" || tx.incomeStatus === "partial");
      if (isReceivable) {
        receivableCount += 1;
        const teamName = String(tx.payerName || (tx as any).teamName || tx.teamId || "미지정 팀");
        const key = String(tx.teamId || teamName);
        const prev = byTeam.get(key);
        byTeam.set(key, { name: teamName, amount: (prev?.amount || 0) + normalizedRemaining });

        const expectedAt = tx.expectedAt || tx.occurredAt || "";
        const overdueDays = daysBetweenIso(expectedAt, nowIso);
        if (overdueDays < 7) overdueBuckets.under7 += 1;
        else if (overdueDays < 14) overdueBuckets.d7_14 += 1;
        else if (overdueDays < 30) overdueBuckets.d14_30 += 1;
        else overdueBuckets.over30 += 1;
      }

      if (netPaid >= amount && amount > 0) {
        const paidAt = tx.paidAt || tx.occurredAt || "";
        const expectedAt = tx.expectedAt || tx.occurredAt || "";
        if (paidAt && expectedAt) {
          paidDaySum += daysBetweenIso(expectedAt, paidAt);
          paidDayCount += 1;
        }
      }
    }

    const collectionRate = totalBilled > 0 ? Math.min(999, Math.max(0, (totalCollected / totalBilled) * 100)) : 0;
    const avgCollectionDays = paidDayCount > 0 ? Math.round((paidDaySum / paidDayCount) * 10) / 10 : null;
    const topTeams = [...byTeam.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
    return {
      collectionRate,
      totalRemaining,
      receivableCount,
      avgCollectionDays,
      overdueBuckets,
      topTeams,
    };
  }, [periodScopedTx]);

  /** 필터 구간 지출 건수·건당 평균 — AI 요약·이상치 힌트용 (일반만) */
  const expenseEntryBreakdown = useMemo(() => {
    let expenseTotalCount = 0;
    let receiptAiCount = 0;
    let manualCount = 0;
    let withReceiptImageCount = 0;
    let sumAi = 0;
    let sumManual = 0;
    for (const tx of generalLedgerTx) {
      if (tx.type !== "expense") continue;
      expenseTotalCount++;
      const a = Math.max(0, tx.amount);
      if (tx.source === "receipt_ai") {
        receiptAiCount++;
        sumAi += a;
      } else {
        manualCount++;
        sumManual += a;
      }
      if (tx.receiptImageUrl?.trim()) withReceiptImageCount++;
    }
    return {
      expenseTotalCount,
      receiptAiCount,
      manualCount,
      withReceiptImageCount,
      avgAmountReceiptAi: receiptAiCount > 0 ? Math.round(sumAi / receiptAiCount) : null,
      avgAmountManual: manualCount > 0 ? Math.round(sumManual / manualCount) : null,
    };
  }, [generalLedgerTx]);

  const expenseAnomalyHints = useMemo(
    () =>
      buildExpenseAnomalyHints(generalLedgerTx, {
        avgAmountReceiptAi: expenseEntryBreakdown.avgAmountReceiptAi,
        avgAmountManual: expenseEntryBreakdown.avgAmountManual,
        expenseByCategoryTotals,
        priorExpenseByCategoryTotals,
      }),
    [
      generalLedgerTx,
      expenseEntryBreakdown.avgAmountReceiptAi,
      expenseEntryBreakdown.avgAmountManual,
      expenseByCategoryTotals,
      priorExpenseByCategoryTotals,
    ]
  );

  const anomalyHintsForAi = useMemo(
    () =>
      toExpenseAnomalyHintsForAi(expenseAnomalyHints, comparisonForAi.label, {
        filteredRowCount: filteredTx.length,
      }),
    [expenseAnomalyHints, comparisonForAi.label, generalLedgerTx.length]
  );

  const aiStatsPayload = useMemo(
    () => ({
      income: totals.income,
      receivableIncome: totals.receivableIncome,
      expense: totals.expense,
      balance: totals.balance,
      incomeByBucket: {
        [BUCKET_LABEL.team_fee]: totals.incomeBy.team_fee,
        [BUCKET_LABEL.competition]: totals.incomeBy.competition,
        [BUCKET_LABEL.sponsor]: totals.incomeBy.sponsor,
        [BUCKET_LABEL.donation]: totals.incomeBy.donation,
        [BUCKET_LABEL.other]: totals.incomeBy.other,
      },
      expenseByCategory: expenseByCategoryTotals,
      rowCount: generalLedgerTx.length,
      expenseEntryBreakdown:
        expenseEntryBreakdown.expenseTotalCount > 0 ? expenseEntryBreakdown : null,
      anomalyHints: anomalyHintsForAi,
    }),
    [totals, expenseByCategoryTotals, generalLedgerTx.length, expenseEntryBreakdown, anomalyHintsForAi]
  );

  const aiSignalsPayload = useMemo(() => {
    const expenseIncreaseVsPrior =
      comparisonForAi.expense > 0
        ? (totals.expense - comparisonForAi.expense) / comparisonForAi.expense
        : null;
    const incomeChangeVsPrior =
      comparisonForAi.income > 0 ? (totals.income - comparisonForAi.income) / comparisonForAi.income : null;
    const anomalyExpenseSpike = expenseIncreaseVsPrior != null && expenseIncreaseVsPrior > 0.3;
    const anomalyIncomeDrop = incomeChangeVsPrior != null && incomeChangeVsPrior < -0.3;

    const te =
      totals.expense > 0
        ? Object.entries(expenseByCategoryTotals)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([label, amount]) => ({
              label,
              amount,
              pctOfTotalExpense: Math.round((amount / totals.expense) * 1000) / 10,
            }))
        : [];

    const ti =
      totals.income > 0
        ? (["team_fee", "competition", "sponsor", "donation", "other"] as const)
            .map((k) => ({ label: BUCKET_LABEL[k], amount: totals.incomeBy[k] || 0 }))
            .filter((x) => x.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3)
            .map(({ label, amount }) => ({
              label,
              amount,
              pctOfTotalIncome: Math.round((amount / totals.income) * 1000) / 10,
            }))
        : [];

    const nearCap = ledger.length >= Math.floor(ledgerCap * 0.95);
    const rc = generalLedgerTx.length;
    let trustLevel: "high" | "medium" | "low";
    let trustReason: string;
    if (nearCap) {
      trustLevel = "low";
      trustReason = `구독 원장이 상한(${ledgerCap}건)에 가까워 일부 거래가 반영되지 않았을 수 있습니다.`;
    } else if (rc < 5) {
      trustLevel = "low";
      trustReason = "필터 구간 거래 건수가 매우 적습니다.";
    } else if (rc < 30) {
      trustLevel = "medium";
      trustReason = "거래 건수가 한정적이라 해석은 참고 수준입니다.";
    } else {
      trustLevel = "high";
      trustReason = "표본 건수와 구독 범위 안에서 요약·질의에 적합합니다.";
    }

    return {
      expenseIncreaseVsPrior,
      incomeChangeVsPrior,
      anomalyExpenseSpike,
      anomalyIncomeDrop,
      topExpenses: te,
      topIncomes: ti,
      trustLevel,
      trustReason,
      ledgerSampleCap: ledgerCap,
      ledgerRowCountSubscribed: ledger.length,
    };
  }, [
    comparisonForAi.expense,
    comparisonForAi.income,
    totals.expense,
    totals.income,
    totals.incomeBy,
    expenseByCategoryTotals,
    generalLedgerTx.length,
    ledger.length,
    ledgerCap,
  ]);

  const aiTransactionsPayload = useMemo(
    () =>
      filteredTx.slice(0, 220).map((tx) => ({
        type: tx.type,
        domain: tx.domain,
        category: tx.type === "expense" ? expenseCategoryLabel(tx.category) : tx.category,
        amount: tx.amount,
        occurredAt: (tx.occurredAt || "").slice(0, 10),
        competitionId: tx.competitionId || undefined,
        memo: tx.memo ? String(tx.memo).slice(0, 200) : undefined,
      })),
    [filteredTx]
  );

  const filterContextForAi = useMemo(() => {
    const m = filterMonth != null ? ` ${filterMonth}월` : "";
    const c = competitionScope
      ? ` · 대회: ${competitions.find((x) => x.id === competitionScope)?.name ?? competitionScope}`
      : " · 협회 전체 범위";
    return `${filterYear}년${m}${c}`;
  }, [filterYear, filterMonth, competitionScope, competitions]);

  const aiAnomalyHintsCacheFingerprint = useMemo(
    () => (anomalyHintsForAi ? JSON.stringify(anomalyHintsForAi) : "x"),
    [anomalyHintsForAi]
  );

  const aiSummaryCacheKey = useMemo(
    () =>
      [
        federationSlug,
        String(filterYear),
        filterMonth != null ? String(filterMonth) : "all",
        competitionScope || "-",
        String(totals.income),
        String(totals.expense),
        String(totals.balance),
        String(filteredTx.length),
        String(comparisonForAi.income),
        String(comparisonForAi.expense),
        String(expenseEntryBreakdown.receiptAiCount),
        String(expenseEntryBreakdown.manualCount),
        String(expenseEntryBreakdown.withReceiptImageCount),
        String(expenseEntryBreakdown.avgAmountReceiptAi ?? "x"),
        String(expenseEntryBreakdown.avgAmountManual ?? "x"),
        aiAnomalyHintsCacheFingerprint,
      ].join("|"),
    [
      federationSlug,
      filterYear,
      filterMonth,
      competitionScope,
      totals.income,
      totals.expense,
      totals.balance,
      filteredTx.length,
      comparisonForAi.income,
      comparisonForAi.expense,
      expenseEntryBreakdown.receiptAiCount,
      expenseEntryBreakdown.manualCount,
      expenseEntryBreakdown.withReceiptImageCount,
      expenseEntryBreakdown.avgAmountReceiptAi,
      expenseEntryBreakdown.avgAmountManual,
      aiAnomalyHintsCacheFingerprint,
    ]
  );

  useEffect(() => {
    const cached = aiSummaryCacheRef.current.get(aiSummaryCacheKey);
    if (cached) setAiSummary(cached);
    else setAiSummary(null);
  }, [aiSummaryCacheKey]);

  useEffect(() => {
    setAiAnswer(null);
  }, [aiSummaryCacheKey]);

  const generateAiSummary = useCallback(async () => {
    if (filteredTx.length === 0) {
      toast.error("요약할 원장이 없습니다. 필터를 조정해 보세요.");
      return;
    }
    const cached = aiSummaryCacheRef.current.get(aiSummaryCacheKey);
    if (cached) {
      setAiSummary(cached);
      toast.info("동일 조건의 요약을 캐시에서 불러왔습니다.");
      return;
    }
    setAiLoading(true);
    setAiSummary(null);
    try {
      const res = await requestFederationAccountingSummary({
        federationSlug,
        filterContext: filterContextForAi,
        stats: aiStatsPayload,
        transactions: aiTransactionsPayload,
        comparison: comparisonForAi,
        signals: aiSignalsPayload,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      aiSummaryCacheRef.current.set(aiSummaryCacheKey, res.summary);
      setAiSummary(res.summary);
      toast.success("AI 회계 요약을 생성했습니다.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "요약 요청에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  }, [
    filteredTx.length,
    federationSlug,
    filterContextForAi,
    aiStatsPayload,
    aiTransactionsPayload,
    comparisonForAi,
    aiSummaryCacheKey,
    aiSignalsPayload,
  ]);

  const submitAiQuestion = useCallback(async () => {
    const q = aiQuestion.trim();
    if (filteredTx.length === 0) {
      toast.error("질문할 원장이 없습니다. 필터를 조정해 보세요.");
      return;
    }
    if (!q) {
      toast.error("질문을 입력해 주세요.");
      return;
    }
    setAiAskLoading(true);
    setAiAnswer(null);
    try {
      const res = await requestFederationAccountingAnswer({
        federationSlug,
        filterContext: filterContextForAi,
        question: q,
        stats: aiStatsPayload,
        transactions: aiTransactionsPayload,
        comparison: comparisonForAi,
        signals: aiSignalsPayload,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAiAnswer(res.answer);
      toast.success("답변을 생성했습니다.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "질문 요청에 실패했습니다.");
    } finally {
      setAiAskLoading(false);
    }
  }, [
    aiQuestion,
    filteredTx.length,
    federationSlug,
    filterContextForAi,
    aiStatsPayload,
    aiTransactionsPayload,
    comparisonForAi,
    aiSignalsPayload,
  ]);

  const copyAiSummary = useCallback(async () => {
    if (!aiSummary?.trim()) return;
    try {
      await navigator.clipboard.writeText(aiSummary);
      toast.success("요약을 클립보드에 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }, [aiSummary]);

  const teamById = useMemo(() => {
    const m = new Map<string, FederationOperatingTeam>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const accountByTeamId = useMemo(() => {
    const m = new Map<string, TeamFeeAccount>();
    for (const a of accounts) m.set(a.teamId, a);
    return m;
  }, [accounts]);

  const teamFeeDelinq = useMemo(() => {
    const active = teams.filter((t) => t.isActive);
    const rows: { team: FederationOperatingTeam; account: TeamFeeAccount | null; reason: string }[] = [];
    for (const team of active) {
      const acc = accountByTeamId.get(team.id) ?? null;
      if (!acc) {
        rows.push({ team, account: null, reason: "회비 계정 없음" });
        continue;
      }
      if (acc.year !== filterYear) continue;
      if (acc.status !== "paid") {
        rows.push({
          team,
          account: acc,
          reason: acc.status === "partial" ? "부분 납부" : "미납",
        });
      }
    }
    return rows;
  }, [teams, accountByTeamId, filterYear]);

  const competitionDelinqFiltered = useMemo(() => {
    if (!competitionScope) return delinqEntries;
    return delinqEntries.filter((e) => e.competitionId === competitionScope);
  }, [delinqEntries, competitionScope]);

  const recentRowsBase = useMemo(() => {
    const sorted = [...filteredTx].sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));
    if (showSubsidyUnlinkedOnly) {
      return sorted
        .filter(
          (tx) =>
            tx.type === "expense" &&
            tx.ledgerDomain === "restricted_fund" &&
            !tx.relatedFundIncomeId?.trim()
        )
        .slice(0, 40);
    }
    return sorted.slice(0, 40);
  }, [filteredTx, showSubsidyUnlinkedOnly]);

  const recentRows = useMemo(() => {
    const byAnomaly =
      ledgerViewMode === "all"
        ? recentRowsBase
        : ledgerViewMode === "anomaly"
          ? recentRowsBase.filter((tx) => tx.type === "expense" && expenseAnomalyHints.flagsByTxId.has(tx.id))
          : recentRowsBase.filter((tx) => tx.type === "expense" && expenseAnomalyHints.severityByTxId.get(tx.id) === "high");
    if (incomeProgressFilter === "all") return byAnomaly;
    return byAnomaly.filter((tx) => {
      const status = getIncomeProgressStatus(tx);
      if (!status) return false;
      return status === incomeProgressFilter;
    });
  }, [
    ledgerViewMode,
    recentRowsBase,
    expenseAnomalyHints.flagsByTxId,
    expenseAnomalyHints.severityByTxId,
    incomeProgressFilter,
  ]);

  const mobileReceivableRows = useMemo(() => {
    return recentRows.filter((tx) => isFederationIncomeReceivable(tx));
  }, [recentRows]);

  useEffect(() => {
    setMobileSelectedReceivableIds((prev) => prev.filter((id) => mobileReceivableRows.some((tx) => tx.id === id)));
  }, [mobileReceivableRows]);

  const incomeProgressSummary = useMemo(() => {
    const out: Record<Exclude<IncomeProgressFilter, "all">, number> = {
      expected: 0,
      partial: 0,
      paid: 0,
      overpaid: 0,
    };
    for (const tx of recentRowsBase) {
      const status = getIncomeProgressStatus(tx);
      if (!status) continue;
      out[status] += 1;
    }
    return out;
  }, [recentRowsBase]);

  const focusHighSeverityInLedger = useCallback(() => {
    setLedgerViewInUrl("high_focus", { replace: false });
    requestAnimationFrame(() => {
      ledgerFlowCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [setLedgerViewInUrl]);

  const openConfirmIncome = useCallback((tx: FederationLedgerTransaction) => {
    const t = new Date();
    setConfirmIncomePaidDate(
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
    );
    setConfirmIncomeTx(tx);
  }, []);

  const scopeCompetitionName = competitionScope
    ? competitions.find((c) => c.id === competitionScope)?.name ?? competitionScope
    : null;

  const reportFilterLabel = useMemo(() => {
    const m = filterMonth != null ? `${filterMonth}월` : "연간";
    const c = competitionScope ? scopeCompetitionName ?? competitionScope : "협회 전체";
    return `${filterYear}년 · ${m} · ${c}`;
  }, [filterYear, filterMonth, competitionScope, scopeCompetitionName]);

  const subsidyReportForPrint = useMemo((): FederationSubsidyReportPrint => {
    const expenses = restrictedLedgerTx
      .filter((tx) => tx.type === "expense")
      .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));

    const expenseRows = expenses.map((tx) => {
      let linkedCaption = "미연결";
      const rid = tx.relatedFundIncomeId?.trim();
      if (rid) {
        const inc = ledger.find((r) => r.id === rid);
        linkedCaption = inc
          ? `${(inc.occurredAt || "").slice(0, 10)} · ${formatWon(inc.amount)} (${inc.id.slice(0, 10)}…)`
          : `원장 ID ${rid.slice(0, 12)}${rid.length > 12 ? "…" : ""}`;
      }
      const memo = [tx.memo != null ? String(tx.memo) : "", tx.relatedFundSource || ""]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 220);
      return {
        occurredAt: tx.occurredAt || "",
        fundPurpose: tx.fundPurpose?.trim() || "(미지정)",
        categoryLabel: expenseCategoryLabel(tx.category),
        amount: Math.max(0, tx.amount),
        linkedCaption,
        memo,
      };
    });

    const unlinkedRows = expenses
      .filter((tx) => !tx.relatedFundIncomeId?.trim())
      .map((tx) => ({
        occurredAt: tx.occurredAt || "",
        amount: Math.max(0, tx.amount),
        memo: [tx.memo != null ? String(tx.memo) : "", tx.relatedFundSource, tx.fundPurpose]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 220),
      }));

    const incomes = restrictedLedgerTx
      .filter((tx) => tx.type === "income" && tx.manualIncome && tx.incomeSourceType === "subsidy")
      .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));

    const incomeRows = incomes.map((tx) => {
      const ref =
        tx.incomeStatus === "paid" ? tx.occurredAt || "" : tx.expectedAt || tx.occurredAt || "";
      const statusLabel =
        tx.incomeStatus === "paid" ? "입금 완료" : tx.incomeStatus === "pending" ? "입금 대기" : "예정";
      const id = tx.id;
      return {
        occurredAt: ref,
        fundSource: tx.fundSource?.trim() || "—",
        fundPurpose: tx.fundPurpose?.trim() || "—",
        amount: Math.max(0, tx.amount),
        statusLabel,
        ledgerIdShort: id.length > 14 ? `${id.slice(0, 14)}…` : id,
      };
    });

    return {
      filterLabel: reportFilterLabel,
      paidIn: subsidyFundTotals.paidIn,
      restrictedExpense: subsidyFundTotals.restrictedExpense,
      balance: subsidyFundTotals.balance,
      usagePct: subsidyAuditMetrics.usagePct,
      auditStatus: subsidyAuditMetrics.unlinkedCount > 0 ? "unlinked" : "ok",
      purposeRows: subsidyAuditMetrics.purposeEntries.map(([label, amount]) => ({ label, amount })),
      expenseRows,
      unlinkedRows,
      incomeRows,
    };
  }, [
    restrictedLedgerTx,
    ledger,
    reportFilterLabel,
    subsidyFundTotals,
    subsidyAuditMetrics,
  ]);

  const handleExportPrintPdf = useCallback(() => {
    if (periodScopedTx.length === 0) {
      toast.error("출력할 원장이 없습니다. 필터를 조정해 보세요.");
      return;
    }
    const displayName = (federationName || "").trim() || federationSlug;
    try {
      const html = renderAccountingReportHtml({
        federationName: displayName,
        federationSlug,
        filterLabel: reportFilterLabel,
        generatedAt: new Date().toISOString(),
        totalIncome: totals.income,
        totalExpense: totals.expense,
        balance: totals.balance,
        incomeBuckets: [
          { label: BUCKET_LABEL.team_fee, amount: totals.incomeBy.team_fee },
          { label: BUCKET_LABEL.competition, amount: totals.incomeBy.competition },
          { label: BUCKET_LABEL.sponsor, amount: totals.incomeBy.sponsor },
          { label: BUCKET_LABEL.donation, amount: totals.incomeBy.donation },
          { label: BUCKET_LABEL.other, amount: totals.incomeBy.other },
        ],
        unpaidTeamCount: teamFeeDelinq.length,
        unpaidCompetitionEntryCount: competitionDelinqFiltered.length,
        monthlyTableYear: filterYear,
        monthlyRows: monthlyChartData.map((r) => ({
          monthLabel: r.monthLabel,
          income: r.수입,
          expense: r.지출,
          cumulativeBalance: r.누적잔액,
        })),
        recentTransactions: [...filteredTx]
          .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""))
          .slice(0, 20)
          .map((tx) => {
            const memoParts: string[] = [];
            if (tx.memo) memoParts.push(String(tx.memo).slice(0, 160));
            if (tx.ledgerDomain === "restricted_fund" && tx.type === "expense") {
              if (tx.fundPurpose) memoParts.push(`용도:${tx.fundPurpose}`);
              if (tx.relatedFundIncomeId) memoParts.push(`연결수입:${tx.relatedFundIncomeId}`);
              if (tx.relatedFundSource) memoParts.push(`재원:${tx.relatedFundSource}`);
            }
            return {
              occurredAt: tx.occurredAt || "",
              type: tx.type,
              domain: operatingDomainLabel(tx.domain),
              category: tx.type === "expense" ? expenseCategoryLabel(tx.category) : String(tx.category || ""),
              amount: Math.max(0, tx.amount),
              memo: memoParts.length ? memoParts.join(" | ").slice(0, 320) : undefined,
            };
          }),
        subsidyReport: subsidyReportForPrint,
        aiSummary: aiSummary?.trim() || undefined,
        ledgerNote: `원장은 최근 ${ledgerCap}건 구독 범위입니다. 집계·표는 이 범위 안의 데이터입니다.`,
      });
      const title = `회계_지원금포함_${federationSlug}_${exportFilterLabel}`;
      openAccountingReportPrintWindow(html, title);
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === "PRINT_WINDOW_BLOCKED") {
        toast.error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.");
        return;
      }
      toast.error(e instanceof Error ? e.message : "인쇄 창을 열지 못했습니다.");
    }
  }, [
    periodScopedTx.length,
    federationName,
    federationSlug,
    reportFilterLabel,
    totals.income,
    totals.expense,
    totals.balance,
    totals.incomeBy,
    teamFeeDelinq.length,
    competitionDelinqFiltered.length,
    filterYear,
    monthlyChartData,
    filteredTx,
    subsidyReportForPrint,
    aiSummary,
    ledgerCap,
    exportFilterLabel,
  ]);

  const handleExportSubsidyOnlyPrintPdf = useCallback(() => {
    const displayName = (federationName || "").trim() || federationSlug;
    try {
      const html = renderSubsidyOnlyReportHtml({
        federationName: displayName,
        federationSlug,
        generatedAt: new Date().toISOString(),
        subsidyReport: subsidyReportForPrint,
        ledgerNote: `원장은 최근 ${ledgerCap}건 구독 범위입니다. 집계·표는 이 범위 안의 데이터입니다.`,
      });
      const title = `지원금보고서_${federationSlug}_${exportFilterLabel}`;
      openAccountingReportPrintWindow(html, title);
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === "PRINT_WINDOW_BLOCKED") {
        toast.error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.");
        return;
      }
      toast.error(e instanceof Error ? e.message : "인쇄 창을 열지 못했습니다.");
    }
  }, [
    federationName,
    federationSlug,
    subsidyReportForPrint,
    ledgerCap,
    exportFilterLabel,
  ]);

  const handlePreviewOverdueReceivables = useCallback(() => {
    void (async () => {
      setPreviewLoading(true);
      try {
        const res = await requestOverdueReceivablesPreview(federationSlug, {
          overdueDays: 7,
          remindIntervalDays: 3,
        });
        if ("error" in res) {
          toast.error(res.error || "미리보기를 불러오지 못했습니다.");
          return;
        }
        setOverduePreview(res);
        toast.success("미수금 알림 미리보기를 불러왔습니다.");
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "미리보기를 불러오지 못했습니다.");
      } finally {
        setPreviewLoading(false);
      }
    })();
  }, [federationSlug]);
  const handleShareOverdueViaKakao = useCallback(() => {
    if (!overduePreview || "error" in overduePreview || overduePreview.federations.length === 0) {
      toast.error("먼저 미수금 알림 미리보기를 실행해 주세요.");
      return;
    }
    const row =
      overduePreview.federations.find((f) => f.fedId === federationSlug) || overduePreview.federations[0];
    if (!row || row.count <= 0) {
      toast.error("공유할 미수금 데이터가 없습니다.");
      return;
    }
    void (async () => {
      try {
        await shareOverdueReceivablesViaKakao({
          federationId: row.fedId,
          federationName: row.federationName,
          count: row.count,
          totalRemaining: row.totalRemaining,
        });
      } catch (e) {
        console.error(e);
        toast.error("카카오 공유를 열 수 없습니다. 링크 복사를 이용해 주세요.");
      }
    })();
  }, [overduePreview, federationSlug]);
  const handleCopyOverdueShareLink = useCallback(() => {
    const link = `${window.location.origin}/share/overdue?fedId=${encodeURIComponent(federationSlug)}`;
    void navigator.clipboard
      .writeText(link)
      .then(() => toast.success("공유 링크를 복사했습니다."))
      .catch(() => toast.error("링크 복사에 실패했습니다."));
  }, [federationSlug]);

  return (
    <div className="space-y-6">
      {ledgerErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          원장 구독 오류: {ledgerErr}
        </div>
      ) : null}

      {/* 필터 행과 분리: 지출·보내기가 줄바꿈에 묻히지 않도록 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpenIncomeDialog(true)} className="gap-1.5">
          수입 등록
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpenBankIncomeAnalyze(true)} className="gap-1.5">
          입금 텍스트 분석
        </Button>
        <Button type="button" onClick={() => setOpenExpenseDialog(true)} className="gap-1.5">
          지출 등록
        </Button>
        <Button type="button" variant="outline" onClick={handleExportXlsx} className="gap-1.5">
          <Download className="w-4 h-4 shrink-0" />
          엑셀
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleExportPrintPdf()} className="gap-1.5">
          <Printer className="w-4 h-4 shrink-0" />
          PDF·인쇄
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleExportSubsidyOnlyPrintPdf()}
          className="gap-1.5 border-violet-200 text-violet-900 hover:bg-violet-50"
          title="기관 제출·이메일용 — 지원금(restricted_fund) 구간만 출력"
        >
          <FileText className="w-4 h-4 shrink-0" />
          지원금만 PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePreviewOverdueReceivables}
          disabled={previewLoading}
          className="gap-1.5"
          title="미수금 자동 알림 발송 전 dry-run 미리보기"
        >
          {previewLoading ? "미리보기 로딩..." : "미수금 알림 미리보기"}
        </Button>
        <Button type="button" variant="outline" onClick={handleShareOverdueViaKakao} className="gap-1.5">
          카카오톡으로 공유
        </Button>
        <Button type="button" variant="ghost" onClick={handleCopyOverdueShareLink} className="gap-1.5">
          링크 복사
        </Button>
      </div>

      {overduePreview && !("error" in overduePreview) ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">미수금 알림 미리보기 (dry-run)</p>
          <p className="text-xs text-blue-800">
            스캔 {overduePreview.scanned}건 · 대상 {overduePreview.dueRows}건 · 협회 {overduePreview.notifiedFederations}곳
          </p>
          {overduePreview.federations.length === 0 ? (
            <p className="text-xs text-blue-700">현재 알림 대상 미수금이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {overduePreview.federations.slice(0, 5).map((f) => (
                <div key={f.fedId} className="rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {f.federationName} ({f.fedId})
                  </p>
                  <p className="text-xs text-gray-700">
                    미수 {f.count}건 · 총 {formatWon(f.totalRemaining)} · 최대 연체 {f.maxOverdueDays}일 · 심각도 {f.severity}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    TOP 팀:{" "}
                    {f.topTeams.length > 0
                      ? f.topTeams.map((t) => `${t.name} ${formatWon(t.amount)}`).join(" / ")
                      : "없음"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-gray-600">기준 연도</Label>
          <Input
            className="mt-1 w-28"
            type="number"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(parseInt(e.target.value, 10) || currentYear);
              setLedgerViewInUrl("all", { replace: true });
            }}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">월 (전체 = 비움)</Label>
          <select
            className="mt-1 w-full min-w-[140px] h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filterMonth === null ? "" : String(filterMonth)}
            onChange={(e) => {
              const v = e.target.value;
              setFilterMonth(v === "" ? null : parseInt(v, 10));
              setLedgerViewInUrl("all", { replace: true });
            }}
          >
            <option value="">전체</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs text-gray-600">대회 범위 (원장 집계)</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={competitionScope}
            onChange={(e) => {
              setCompetitionScope(e.target.value);
              setLedgerViewInUrl("all", { replace: true });
            }}
          >
            <option value="">협회 전체 (회비·대회·기타)</option>
            {compsInYear.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.year}] {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <Label className="text-xs text-gray-600">회계 트랙</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={ledgerScope}
            onChange={(e) => {
              setLedgerScope(e.target.value as "all" | "general" | "restricted_fund");
              setLedgerViewInUrl("all", { replace: true });
            }}
          >
            <option value="all">전체 (원장 표만)</option>
            <option value="general">일반 회계</option>
            <option value="restricted_fund">지원금 회계</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-gray-600 whitespace-nowrap">원장 최대 {ledgerCap}건</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setLedgerCap((n) => Math.min(2000, n + 400))}>
            더 불러오기
          </Button>
        </div>
      </div>

      {competitionScope ? (
        <p className="text-xs text-gray-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-800">대회 손익 모드:</span> 수입은 「{scopeCompetitionName}」
          참가비(자동 원장) 및 <code className="text-[10px] bg-white px-1 rounded border">competitionId</code>로 연결된
          수동 수입만, 지출은 동일 필드가 이 대회와 일치하는 건만 집계합니다. 그 외는 「협회 전체」에서 확인하세요.
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          원장은 최근 {ledgerCap}건까지 구독합니다. 집계가 부족하면 「더 불러오기」를 누르세요.
        </p>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-blue-950">회수율 · KPI 대시보드</h3>
          <p className="text-[11px] text-blue-900/80">대회 참가비(expected) 기준</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-[11px] text-gray-500">회수율</p>
            <p className="text-lg font-semibold text-blue-900 tabular-nums">
              {Math.round(collectionKpi.collectionRate * 10) / 10}%
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-[11px] text-gray-500">미수금 총액</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatWon(collectionKpi.totalRemaining)}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-[11px] text-gray-500">미수 건수</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{collectionKpi.receivableCount}건</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-[11px] text-gray-500">평균 회수 기간</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {collectionKpi.avgCollectionDays != null ? `${collectionKpi.avgCollectionDays}일` : "—"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-xs font-medium text-gray-800 mb-1">연체 구간 분포</p>
            <p className="text-[12px] text-gray-700 tabular-nums">
              7일 미만 {collectionKpi.overdueBuckets.under7}건 · 7~14일 {collectionKpi.overdueBuckets.d7_14}건 · 14~30일{" "}
              {collectionKpi.overdueBuckets.d14_30}건 · 30일+ {collectionKpi.overdueBuckets.over30}건
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="text-xs font-medium text-gray-800 mb-1">팀별 미납 TOP</p>
            {collectionKpi.topTeams.length === 0 ? (
              <p className="text-[12px] text-gray-500">현재 미납 팀이 없습니다.</p>
            ) : (
              <p className="text-[12px] text-gray-700">
                {collectionKpi.topTeams.map((t) => `${t.name} ${formatWon(t.amount)}`).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="입금 완료 수입" value={formatWon(totals.income)} tone="in" />
        <SummaryCard label="미수금 (수동)" value={formatWon(totals.receivableIncome)} tone="rcv" />
        <SummaryCard label="총 지출" value={formatWon(totals.expense)} tone="out" />
        <SummaryCard
          label={competitionScope ? "순이익 (대회)" : "잔액 (입금완료−지출)"}
          value={formatWon(totals.balance)}
          tone="bal"
        />
      </div>
      <p className="text-[11px] text-gray-500">
        위 네 카드는 <span className="font-medium text-gray-700">일반 회계(general)</span>만 집계합니다. 관 지원금 트랙은 아래
        잔액 박스·「회계 트랙」필터에서 다룹니다.
      </p>

      <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold text-amber-950">지원금 회계 · 필터 구간 (restricted_fund)</p>
        <p className="text-[11px] text-amber-900/90 mt-1">
          <code className="text-[10px] bg-white px-1 rounded border">ledgerDomain: restricted_fund</code> 원장만 집계합니다.
          지출은 「관 지원금(한정) 집행」으로 등록해야 같은 트랙에 쌓입니다. 상단 4카드는 일반 회계만 표시합니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm tabular-nums text-gray-900">
          <span>
            지원금 총액(입금 완료) <span className="font-semibold">{formatWon(subsidyFundTotals.paidIn)}</span>
          </span>
          <span>
            지원금 사용(지출) <span className="font-semibold">{formatWon(subsidyFundTotals.restrictedExpense)}</span>
          </span>
          <span>
            남은 지원금 <span className="font-semibold text-amber-950">{formatWon(subsidyFundTotals.balance)}</span>
          </span>
        </div>
        {subsidyFundTotals.paidIn > 0 ? (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-amber-900/90 tabular-nums mb-1">
              <span>집행률 (지출 ÷ 입금완료 수입)</span>
              <span className="font-medium">
                {subsidyAuditMetrics.usagePct != null ? `${subsidyAuditMetrics.usagePct}%` : "—"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-amber-200/70 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-600 transition-all"
                style={{
                  width: `${Math.min(100, (subsidyFundTotals.restrictedExpense / subsidyFundTotals.paidIn) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/35 px-4 py-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-violet-950">지원금 감사</p>
            <p className="text-[11px] text-violet-900/85 mt-0.5 max-w-xl leading-relaxed">
              현재 연·월·대회 필터와 동일한 <code className="text-[10px] bg-white/80 px-1 rounded border">restricted_fund</code>{" "}
              구간만 집계합니다. 원장은 최근 40건 기준입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                setLedgerScope("restricted_fund");
                setLedgerViewInUrl("all", { replace: true });
                setShowSubsidyUnlinkedOnly(false);
              }}
            >
              지원금 회계만
            </Button>
            <Button
              type="button"
              variant={showSubsidyUnlinkedOnly ? "default" : "outline"}
              size="sm"
              className={
                showSubsidyUnlinkedOnly
                  ? "text-xs h-8 bg-violet-700 hover:bg-violet-800 text-white border-violet-700"
                  : "text-xs h-8 border-violet-200 text-violet-900"
              }
              onClick={() => {
                setShowSubsidyUnlinkedOnly((prev) => {
                  if (!prev) {
                    setLedgerScope("restricted_fund");
                    setLedgerViewInUrl("all", { replace: true });
                  }
                  return !prev;
                });
              }}
            >
              연결 누락 지출만
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs tabular-nums text-gray-800">
          <span className="rounded-md bg-white/70 border border-violet-100 px-2 py-1">
            입금완료 지원금 수입 <span className="font-semibold">{subsidyAuditMetrics.paidSubsidyIncomeCount}</span>건
          </span>
          <span className="rounded-md bg-white/70 border border-violet-100 px-2 py-1">
            지원금 지출 <span className="font-semibold">{subsidyAuditMetrics.expenseCount}</span>건
          </span>
          <span
            className={`rounded-md border px-2 py-1 ${
              subsidyAuditMetrics.unlinkedCount > 0
                ? "bg-violet-100/90 border-violet-300 text-violet-950 font-medium"
                : "bg-white/70 border-violet-100"
            }`}
          >
            수입 미연결 지출{" "}
            <span className="font-semibold tabular-nums">{subsidyAuditMetrics.unlinkedCount}</span>건 ·{" "}
            {formatWon(subsidyAuditMetrics.unlinkedSum)}
          </span>
          {subsidyAuditMetrics.receivableSubsidy > 0 ? (
            <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-amber-950">
              지원금 미수(예정·대기) {formatWon(subsidyAuditMetrics.receivableSubsidy)}
            </span>
          ) : null}
        </div>

        {subsidyAuditMetrics.unlinkedCount > 0 ? (
          <p className="text-[11px] text-violet-900 leading-relaxed">
            아래 원장에서 <span className="font-medium">보라색 배경</span>은 지원금 지출이면서{" "}
            <span className="font-medium">입금 완료 지원금 수입과 연결되지 않은</span> 건입니다. 이후 지출은 등록 시 「연결할
            지원금 수입」을 선택하면 추적이 명확해집니다.
          </p>
        ) : subsidyAuditMetrics.expenseCount > 0 ? (
          <p className="text-[11px] text-emerald-800/90">이 구간의 지원금 지출은 모두 특정 수입 건과 연결되었거나, 연결 누락이 없습니다.</p>
        ) : null}

        {subsidyAuditMetrics.purposeEntries.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold text-violet-950 mb-2">용도별 지원금 지출 (fundPurpose)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {subsidyAuditMetrics.purposeEntries.map(([label, amount]) => (
                <div
                  key={label}
                  className="rounded-lg border border-violet-100 bg-white/80 px-2.5 py-2 text-[11px] shadow-sm"
                >
                  <div className="text-violet-900/90 truncate font-medium" title={label}>
                    {label}
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{formatWon(amount)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-500">이 구간에 지원금 지출이 없어 용도별 집계가 비어 있습니다.</p>
        )}

        {showSubsidyUnlinkedOnly ? (
          <p className="text-[10px] text-violet-800 border-t border-violet-100 pt-2">
            원장 표는 「연결 누락」지원금 지출만 최대 40건까지 표시합니다. 「연결 누락 지출만」을 다시 누르면 해제됩니다.
          </p>
        ) : null}
      </div>

      {expenseEntryBreakdown.expenseTotalCount > 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            지출 이상 힌트 (규칙 기반)
          </h3>
          <p className="text-[11px] text-gray-600 mb-2">
            현재 필터 구간의 지출만 대상입니다. 평균 대비 2배 초과(2만원 이상), 동일 상호 3건 이상, 직전 기간(
            {comparisonForAi.label}) 대비 동일 카테고리 1.5배이면서 당기 5만원·전기 3만원 이상일 때 표시됩니다.
          </p>
          <p className="text-[10px] text-gray-500 mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <AnomalySeverityDot severity="high" /> 높음
            </span>
            <span className="inline-flex items-center gap-1">
              <AnomalySeverityDot severity="medium" /> 보통
            </span>
            <span className="inline-flex items-center gap-1">
              <AnomalySeverityDot severity="low" /> 낮음
            </span>
          </p>
          {!expenseAnomalyHints.hasAny ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium text-gray-800">현재 필터 범위에서 이상 지출이 감지되지 않았습니다.</p>
              <p className="text-[13px] text-gray-600">위 규칙(평균 대비 고액·반복 상호·카테고리 급증)에 해당하는 신호가 없습니다.</p>
            </div>
          ) : (
            <>
              {(expenseAnomalyHints.highSeverityExpenseCount > 0 ||
                expenseAnomalyHints.highSeverityCategorySpikeCount > 0) &&
                (expenseAnomalyHints.highSeverityExpenseCount > 0 ? (
                  <button
                    type="button"
                    className="mb-3 w-full text-left rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-900 hover:bg-red-100/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                    onClick={() => focusHighSeverityInLedger()}
                  >
                    <p className="font-semibold flex flex-wrap items-center gap-2">
                      <AnomalySeverityDot severity="high" className="size-2.5" />
                      <span className="tabular-nums">
                        <>중요 이상 지출 {expenseAnomalyHints.highSeverityExpenseCount}건</>
                        {expenseAnomalyHints.highSeverityCategorySpikeCount > 0 ? (
                          <>
                            <span className="text-red-700 font-normal"> · </span>
                            <>심각도 높은 카테고리 급증 {expenseAnomalyHints.highSeverityCategorySpikeCount}건</>
                          </>
                        ) : null}
                      </span>
                    </p>
                    <p className="text-[11px] text-red-800/90 mt-1">
                      심각도 「높음」 지출만 원장에서 모아 봅니다. 클릭하면 아래 원장으로 이동합니다.
                    </p>
                  </button>
                ) : (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-900">
                    <p className="font-semibold flex flex-wrap items-center gap-2">
                      <AnomalySeverityDot severity="high" className="size-2.5" />
                      <span className="tabular-nums">
                        심각도 높은 카테고리 급증 {expenseAnomalyHints.highSeverityCategorySpikeCount}건
                      </span>
                    </p>
                    <p className="text-[11px] text-red-800/90 mt-1">
                      해당 지출 건의 심각도는 「높음」이 아닙니다. 위 목록에서 카테고리별 금액을 확인하세요.
                    </p>
                  </div>
                ))}
              <p className="text-[11px] text-gray-800 mb-3 font-medium tabular-nums bg-white/60 rounded-md px-2 py-1.5 border border-amber-100/80">
                유형 건수: 고액 {expenseAnomalyHints.countsByKind.high_amount}건 · 반복 상호{" "}
                {expenseAnomalyHints.countsByKind.repeated_merchant}그룹 · 카테고리 급증{" "}
                {expenseAnomalyHints.countsByKind.category_spike}건
              </p>
              <ul className="space-y-3 text-sm text-gray-800">
                {expenseAnomalyHints.categorySpikes.length > 0 ? (
                  <li>
                    <p className="text-xs font-semibold text-amber-900 mb-1">카테고리 급증</p>
                    <ul className="space-y-1.5 text-[13px] pl-0 list-none">
                      {expenseAnomalyHints.categorySpikes.map((s) => (
                        <li key={s.categoryLabel} className="flex gap-2 items-start">
                          <AnomalySeverityDot severity={s.severity} className="mt-1.5" />
                          <span>
                            <span className="font-medium">{s.categoryLabel}</span>: 이번 구간 {formatWon(s.current)} —{" "}
                            {comparisonForAi.label} {formatWon(s.prior)} 대비 약{" "}
                            <span className="font-semibold">{s.ratio}배</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {expenseAnomalyHints.repeatedMerchants.length > 0 ? (
                  <li>
                    <p className="text-xs font-semibold text-amber-900 mb-1">동일 상호 반복</p>
                    <ul className="space-y-1.5 text-[13px] pl-0 list-none">
                      {expenseAnomalyHints.repeatedMerchants.slice(0, 6).map((r) => (
                        <li key={r.key} className="flex gap-2 items-start">
                          <AnomalySeverityDot severity={r.severity} className="mt-1.5" />
                          <span>
                            <span className="font-medium">{r.displayName}</span> — {r.count}건, 합계{" "}
                            {formatWon(r.totalAmount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {expenseAnomalyHints.highAmount.length > 0 ? (
                  <li>
                    <p className="text-xs font-semibold text-amber-900 mb-1">평균 대비 고액</p>
                    <ul className="space-y-1.5 text-[13px] pl-0 list-none">
                      {expenseAnomalyHints.highAmount.map((h) => (
                        <li key={h.txId} className="flex gap-2 items-start">
                          <AnomalySeverityDot severity={h.severity} className="mt-1.5" />
                          <span>
                            {h.occurredAt.slice(0, 10)} · {h.categoryLabel}
                            {h.merchantName ? ` · ${h.merchantName}` : ""} — {formatWon(h.amount)}{" "}
                            <span className="text-gray-600">
                              ({h.baselineLabel} 대비 약 {h.ratio}배)
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">월별 추이 ({filterYear}년)</h3>
          <p className="text-[11px] text-gray-500">
            막대 「수입」은 입금 완료(paid)만 포함합니다. 「전체」트랙일 때는 일반 회계만 표시해 지원금과 혼합하지 않습니다.
            지원금만 보려면 회계 트랙에서 「지원금 회계」를 선택하세요. 연도·대회 기준. 「월」필터는 표·상단 카드에만 적용됩니다.
            구독 {ledgerCap}건 밖 데이터는 반영되지 않습니다.
          </p>
        </div>
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tickFormatter={(v) => formatAxisWon(Number(v))} tick={{ fontSize: 11 }} stroke="#6b7280" width={44} />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  typeof value === "number" ? formatWon(value) : value,
                  name,
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.96)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="수입" name="월 수입" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="지출" name="월 지출" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="누적잔액" name="연 누적 잔액" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              AI 회계 요약 · 데이터 질문
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full tabular-nums ${
                  aiSignalsPayload.trustLevel === "high"
                    ? "bg-emerald-100 text-emerald-800"
                    : aiSignalsPayload.trustLevel === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                }`}
                title={aiSignalsPayload.trustReason}
              >
                신뢰도{" "}
                {aiSignalsPayload.trustLevel === "high"
                  ? "높음"
                  : aiSignalsPayload.trustLevel === "medium"
                    ? "보통"
                    : "낮음"}
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
              집계·거래 샘플(최대 220건)과{" "}
              <span className="font-medium text-gray-600">
                {filterMonth != null ? "전월" : "전년 연간"}
              </span>
              비교·Top3·규칙 기반 이상 신호·
              <span className="font-medium text-gray-600">지출 이상 힌트</span>(필터 구간 거래 5건 이상일 때만)를 함께
              보냅니다. 필터를 바꾸면 저장된 요약이 있으면 자동으로 불러옵니다.
            </p>
            <p className="text-[10px] text-gray-500 mt-1">{aiSignalsPayload.trustReason}</p>
            {(aiSignalsPayload.anomalyExpenseSpike || aiSignalsPayload.anomalyIncomeDrop) && (
              <p className="text-[10px] text-rose-700 mt-0.5 font-medium">
                {aiSignalsPayload.anomalyExpenseSpike && "전기 대비 지출 증가율 30% 초과로 표시됨. "}
                {aiSignalsPayload.anomalyIncomeDrop && "전기 대비 수입 감소율 30% 초과로 표시됨."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void generateAiSummary()}
              disabled={aiLoading}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {aiLoading ? "생성 중…" : "요약 생성"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => void copyAiSummary()}
              disabled={!aiSummary?.trim()}
            >
              <Clipboard className="w-4 h-4 shrink-0" />
              복사
            </Button>
          </div>
        </div>
        {aiSummary ? (
          <div className="mt-3 rounded-lg border border-gray-100 bg-white/90 px-3 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {aiSummary}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-1">
            Cloud Function <code className="text-[10px] bg-gray-100 px-1 rounded">summarizeFederationAccounting</code>·
            <code className="text-[10px] bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> 배포 후 사용할 수 있습니다.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-indigo-100/80">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircleQuestionMark className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-800">데이터에 질문하기</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="예: 이번 달 적자 원인은? / 지출이 가장 큰 항목은?"
              className="text-sm flex-1"
              maxLength={400}
              disabled={aiAskLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitAiQuestion();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => void submitAiQuestion()}
              disabled={aiAskLoading || filteredTx.length === 0}
            >
              {aiAskLoading ? "응답 중…" : "질문하기"}
            </Button>
          </div>
          {aiAnswer ? (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-white px-3 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {aiAnswer}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-2">
              Callable <code className="text-[10px] bg-gray-100 px-1 rounded">askFederationAccounting</code> — 제공된 집계·샘플
              범위 안에서만 답합니다.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">수입 구성</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["team_fee", "competition", "sponsor", "donation", "other"] as const).map((key) => (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-[11px] text-gray-500">{BUCKET_LABEL[key]}</p>
              <p className="text-base font-semibold tabular-nums text-gray-900 mt-1">{formatWon(totals.incomeBy[key] || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            회비 미납 · 부분 ({filterYear}년, 활성 팀)
          </h3>
          {teamFeeDelinq.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">해당 연도 기준 미납 팀이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-2">팀</th>
                    <th className="py-2 pr-2">상태</th>
                    <th className="py-2 text-right">납부/청구</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamFeeDelinq.map(({ team, account, reason }) => (
                    <tr key={team.id}>
                      <td className="py-2 pr-2 font-medium text-gray-900">{team.name}</td>
                      <td className="py-2 pr-2 text-gray-600">{reason}</td>
                      <td className="py-2 text-right tabular-nums text-gray-700">
                        {account
                          ? `${formatWon(account.paidAmount)} / ${formatWon(account.billedAmount)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            대회 참가비 미완납 ({filterYear}년 개최 대회)
            {competitionScope ? ` · ${scopeCompetitionName}` : ""}
          </h3>
          {competitionDelinqFiltered.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">미완납 엔트리가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-2">대회</th>
                    <th className="py-2 pr-2">팀</th>
                    <th className="py-2 pr-2">상태</th>
                    <th className="py-2 text-right">납부/청구</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {competitionDelinqFiltered.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-2 text-gray-700">{e.competitionName}</td>
                      <td className="py-2 pr-2 font-medium text-gray-900">{e.teamName || teamById.get(e.teamId)?.name || e.teamId}</td>
                      <td className="py-2 pr-2 text-gray-600">{e.status === "partial" ? "부분" : "미납"}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatWon(e.paidAmount)} / {formatWon(e.totalFeeAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div
        ref={ledgerFlowCardRef}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">원장 흐름 (필터 적용, 최근 40건)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-500 hidden sm:inline">표시</span>
            <div className="hidden md:inline-flex flex-wrap rounded-md border border-gray-200 bg-gray-50/90 p-0.5 gap-0.5">
              <Button
                type="button"
                variant={ledgerViewMode === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setLedgerViewInUrl("all", { replace: true })}
              >
                전체
              </Button>
              <Button
                type="button"
                variant={ledgerViewMode === "anomaly" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={!expenseAnomalyHints.hasAny}
                title={
                  !expenseAnomalyHints.hasAny
                    ? "현재 필터에서 이상 힌트가 없습니다."
                    : "이상 힌트가 붙은 지출만 (최근 40건 범위)"
                }
                onClick={() => setLedgerViewInUrl("anomaly", { replace: true })}
              >
                이상 지출만
              </Button>
              <Button
                type="button"
                variant={ledgerViewMode === "high_focus" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={expenseAnomalyHints.highSeverityExpenseCount === 0}
                title={
                  expenseAnomalyHints.highSeverityExpenseCount === 0
                    ? "심각도 높음인 지출 건이 없습니다."
                    : "심각도 높음 지출만 (최근 40건 범위)"
                }
                onClick={() => setLedgerViewInUrl("high_focus", { replace: true })}
              >
                심각도 높음만
              </Button>
            </div>
            <div className="hidden md:inline-flex flex-wrap rounded-md border border-gray-200 bg-white p-0.5 gap-0.5">
              {(["all", "expected", "partial", "paid", "overpaid"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={incomeProgressFilter === k ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  onClick={() => setIncomeProgressInUrl(k, { replace: true })}
                >
                  {k}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="md:hidden grid grid-cols-1 gap-2 mb-3">
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={ledgerViewMode}
            onChange={(e) => setLedgerViewInUrl(e.target.value as LedgerViewMode, { replace: true })}
          >
            <option value="all">표시: 전체</option>
            <option value="anomaly">표시: 이상 지출만</option>
            <option value="high_focus">표시: 심각도 높음만</option>
          </select>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={incomeProgressFilter}
            onChange={(e) => setIncomeProgressInUrl(e.target.value as IncomeProgressFilter, { replace: true })}
          >
            <option value="all">입금 상태: 전체</option>
            <option value="expected">입금 상태: expected</option>
            <option value="partial">입금 상태: partial</option>
            <option value="paid">입금 상태: paid</option>
            <option value="overpaid">입금 상태: overpaid</option>
          </select>
        </div>
        <p className="text-[11px] text-gray-600 mb-2">
          expected {incomeProgressSummary.expected} · partial {incomeProgressSummary.partial} · paid{" "}
          {incomeProgressSummary.paid} · overpaid {incomeProgressSummary.overpaid}
        </p>
        {ledgerViewMode === "high_focus" && expenseAnomalyHints.highSeverityExpenseCount > 0 ? (
          <p className="text-[11px] text-red-800/90 font-medium mb-2">
            심각도 「높음」 지출만 표시 중입니다. (최근 40건 안에 있는 건만)
          </p>
        ) : null}
        {!expenseAnomalyHints.hasAny ? (
          <p className="text-[11px] text-gray-600 mt-2 max-w-lg leading-relaxed">
            현재 필터 범위에서 이상 지출이 감지되지 않았습니다. 「이상 지출만」은 힌트가 있을 때 사용할 수 있습니다.
          </p>
        ) : null}
        {recentRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            {ledgerViewMode === "anomaly" && expenseAnomalyHints.hasAny
              ? "이상 힌트에 해당하는 지출이 최근 40건 안에 없습니다. 「전체」로 보거나 상단에서 더 불러오기·필터를 조정해 보세요."
              : ledgerViewMode === "high_focus" && expenseAnomalyHints.highSeverityExpenseCount > 0
                ? "심각도 높은 지출이 최근 40건 안에 없습니다. 「전체」로 보거나 상단에서 더 불러오기·필터를 조정해 보세요."
                : "조건에 맞는 원장이 없습니다."}
          </p>
        ) : (
          <>
          <div className="md:hidden space-y-3">
            {recentRows.map((tx) => {
              const status = getIncomeProgressStatus(tx);
              const isReceivable = isFederationIncomeReceivable(tx);
              const isSelected = mobileSelectedReceivableIds.includes(tx.id);
              const remaining = Math.max(
                0,
                Math.floor(
                  typeof tx.remainingAmount === "number"
                    ? tx.remainingAmount
                    : Math.max(0, tx.amount) - Math.max(0, typeof tx.paidAmount === "number" ? tx.paidAmount : 0)
                )
              );
              const title = tx.payerName?.trim() || tx.teamId?.trim() || tx.competitionId?.trim() || "원장 항목";
              return (
                <div key={tx.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-[11px] text-gray-500">{tx.occurredAt?.slice(0, 10) || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {status ? <IncomeProgressBadge status={status} /> : null}
                      {isReceivable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setMobileSelectedReceivableIds((prev) => {
                              if (checked) return [...new Set([...prev, tx.id])];
                              return prev.filter((id) => id !== tx.id);
                            });
                          }}
                          className="h-4 w-4"
                          aria-label="선택"
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">{formatWon(tx.amount)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    남은금액: <span className="font-medium tabular-nums">{formatWon(remaining)}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className="h-11 text-sm"
                      disabled={!isReceivable}
                      onClick={() => {
                        if (!isReceivable) return;
                        openConfirmIncome(tx);
                      }}
                    >
                      입금 확인
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 text-sm"
                      onClick={() => {
                        const detail = [
                          `도메인: ${tx.domain}`,
                          `분류: ${tx.type === "expense" ? expenseCategoryLabel(tx.category) : tx.category}`,
                          `메모: ${tx.memo || "없음"}`,
                        ].join("\n");
                        toast.message("원장 상세", { description: detail });
                      }}
                    >
                      상세
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {mobileReceivableRows.length > 0 ? (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl space-y-2">
                <p className="text-[11px] text-gray-600">
                  선택 {mobileSelectedReceivableIds.length}건 / 미수 {mobileReceivableRows.length}건
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 text-sm"
                    onClick={() => setMobileSelectedReceivableIds(mobileReceivableRows.map((tx) => tx.id))}
                  >
                    전체 선택
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 text-sm"
                    onClick={() => setMobileSelectedReceivableIds([])}
                  >
                    선택 해제
                  </Button>
                  <Button
                    type="button"
                    className="h-11 text-sm"
                    disabled={mobileSelectedReceivableIds.length === 0}
                    onClick={() => {
                      const target = mobileReceivableRows.find((tx) => tx.id === mobileSelectedReceivableIds[0]);
                      if (!target) return;
                      openConfirmIncome(target);
                      if (mobileSelectedReceivableIds.length > 1) {
                        toast.message("선택 항목 처리", {
                          description: `먼저 1건을 열었습니다. 나머지 ${mobileSelectedReceivableIds.length - 1}건도 순차 처리하세요.`,
                        });
                      }
                    }}
                  >
                    선택 항목 처리
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-2">일자</th>
                  <th className="py-2 pr-2">구분</th>
                  <th className="py-2 pr-2 w-16">회계</th>
                  <th className="py-2 pr-2">도메인</th>
                  <th className="py-2 pr-2">분류</th>
                  <th className="py-2 pr-2 w-20">입금 상태</th>
                  <th className="py-2 pr-2 w-14">힌트</th>
                  <th className="py-2 pr-2">증빙</th>
                  <th className="py-2 pr-2 w-[88px]">액션</th>
                  <th className="py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRows.map((tx) => {
                  const unlinkedRestricted =
                    tx.type === "expense" &&
                    tx.ledgerDomain === "restricted_fund" &&
                    !tx.relatedFundIncomeId?.trim();
                  const rowClass =
                    ledgerViewMode === "high_focus" &&
                    tx.type === "expense" &&
                    expenseAnomalyHints.severityByTxId.get(tx.id) === "high"
                      ? "bg-red-50/70 ring-1 ring-inset ring-red-100"
                      : ledgerViewMode === "anomaly" &&
                          tx.type === "expense" &&
                          expenseAnomalyHints.flagsByTxId.has(tx.id)
                        ? "bg-amber-50/40"
                        : unlinkedRestricted
                          ? "bg-violet-50/80 ring-1 ring-inset ring-violet-200"
                          : undefined;
                  return (
                  <tr
                    key={tx.id}
                    className={rowClass}
                  >
                    <td className="py-2 pr-2 whitespace-nowrap text-gray-700">{tx.occurredAt?.slice(0, 10) ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <span className={tx.type === "expense" ? "text-rose-700" : "text-emerald-700"}>
                        {tx.type === "expense" ? "지출" : "수입"}
                      </span>
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      {tx.ledgerDomain === "restricted_fund" ? (
                        <span className="inline-flex flex-col items-start gap-0.5">
                          <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950 whitespace-nowrap">
                            지원금
                          </span>
                          {tx.type === "expense" && !tx.relatedFundIncomeId?.trim() ? (
                            <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-900 whitespace-nowrap">
                              미연결
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">일반</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-gray-600">{tx.domain}</td>
                    <td
                      className="py-2 pr-2 text-gray-600 max-w-[200px] align-top"
                      title={
                        tx.type === "expense"
                          ? [expenseCategoryLabel(tx.category), tx.fundPurpose, tx.relatedFundSource].filter(Boolean).join(" · ") ||
                            undefined
                          : undefined
                      }
                    >
                      <div className="font-medium text-gray-700">
                        {tx.type === "expense"
                          ? expenseCategoryLabel(tx.category)
                          : tx.manualIncome && tx.incomeSourceType
                            ? federationIncomeSourceLabel(tx.incomeSourceType)
                            : tx.category}
                      </div>
                      {tx.type === "expense" && tx.ledgerDomain === "restricted_fund" ? (
                        <div className="text-[9px] text-amber-950/90 space-y-0.5 mt-1 leading-snug">
                          {tx.fundPurpose ? <div>용도: {tx.fundPurpose}</div> : null}
                          {tx.relatedFundIncomeId ? (
                            <div>
                              연결 수입:{" "}
                              {(() => {
                                const inc = ledger.find((r) => r.id === tx.relatedFundIncomeId);
                                return inc
                                  ? `${inc.occurredAt?.slice(0, 10) ?? "—"} · ${inc.amount.toLocaleString("ko-KR")}원`
                                  : `${tx.relatedFundIncomeId.slice(0, 10)}…`;
                              })()}
                            </div>
                          ) : null}
                          {tx.relatedFundSource ? <div className="text-gray-600">재원 메모: {tx.relatedFundSource}</div> : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 align-middle text-[11px] text-gray-700 whitespace-nowrap">
                      {(() => {
                        const status = getIncomeProgressStatus(tx);
                        if (!status) return <span className="text-gray-300">—</span>;
                        const overpaidAmount =
                          status === "overpaid"
                            ? Math.max(
                                0,
                                Math.floor((typeof tx.paidAmount === "number" ? tx.paidAmount : 0) - (tx.amount || 0))
                              )
                            : 0;
                        return (
                          <span className="inline-flex flex-col items-start gap-0.5">
                            <IncomeProgressBadge status={status} />
                            {status === "overpaid" ? (
                              <span className="text-[10px] text-violet-700">+{formatWon(overpaidAmount)}</span>
                            ) : null}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      {tx.type === "expense" ? (
                        (() => {
                          const fs = expenseAnomalyHints.flagsByTxId.get(tx.id);
                          if (!fs?.size) {
                            return <span className="text-gray-200 text-xs">—</span>;
                          }
                          const parts: string[] = [];
                          if (fs.has("HIGH_AMOUNT")) parts.push("평균 대비 고액");
                          if (fs.has("REPEATED_MERCHANT")) parts.push("동일 상호 반복");
                          const sev = expenseAnomalyHints.severityByTxId.get(tx.id);
                          const chips = [
                            fs.has("HIGH_AMOUNT") ? "고액" : "",
                            fs.has("REPEATED_MERCHANT") ? "반복" : "",
                          ].filter(Boolean);
                          return (
                            <span className="inline-flex items-center gap-1 flex-wrap max-w-[88px]" title={parts.join(" · ")}>
                              {sev ? <AnomalySeverityDot severity={sev} /> : null}
                              <span className="text-[9px] text-gray-600 leading-tight">{chips.join("·")}</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {tx.type === "expense" ? (
                        <div className="flex flex-col gap-1 items-start max-w-[150px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block size-2 shrink-0 rounded-full ${
                                tx.source === "receipt_ai" && tx.receiptImageUrl?.trim()
                                  ? "bg-emerald-500"
                                  : tx.receiptImageUrl?.trim()
                                    ? "bg-amber-400"
                                    : "bg-rose-500"
                              }`}
                              title={
                                tx.source === "receipt_ai" && tx.receiptImageUrl?.trim()
                                  ? "AI 등록 + 영수증 이미지"
                                  : tx.receiptImageUrl?.trim()
                                    ? "수기 + 영수증 이미지"
                                    : "수기, 이미지 없음"
                              }
                              aria-hidden
                            />
                            <span className="text-[10px] font-medium">
                              {tx.source === "receipt_ai" ? (
                                <span className="text-indigo-700">AI 영수증</span>
                              ) : (
                                <span className="text-gray-500">수기</span>
                              )}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-600 pl-3.5">
                            {tx.receiptImageUrl?.trim() ? (
                              <span className="text-emerald-800">영수증 이미지 있음</span>
                            ) : (
                              <span className="text-gray-400">이미지 없음</span>
                            )}
                          </span>
                          {tx.receiptImageUrl?.trim() ? (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-[10px] text-primary"
                              onClick={() =>
                                window.open(tx.receiptImageUrl!, "_blank", "noopener,noreferrer")
                              }
                            >
                              영수증 보기
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      {isFederationIncomeReceivable(tx) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 whitespace-nowrap"
                          onClick={() => openConfirmIncome(tx)}
                        >
                          입금 확인
                        </Button>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatWon(tx.amount)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <FederationBankIncomeAnalyzeDialog
        open={openBankIncomeAnalyze}
        onClose={() => setOpenBankIncomeAnalyze(false)}
        federationSlug={federationSlug}
        onRecorded={() => {
          aiSummaryCacheRef.current.clear();
          setAiSummary(null);
          setAiAnswer(null);
        }}
      />

      <FederationIncomeDialog
        open={openIncomeDialog}
        onClose={() => setOpenIncomeDialog(false)}
        federationSlug={federationSlug}
        defaultYear={filterYear}
        defaultMonth={filterMonth}
        competitions={competitions}
        presetCompetitionId={competitionScope || undefined}
        onRecorded={() => {
          aiSummaryCacheRef.current.clear();
          setAiSummary(null);
          setAiAnswer(null);
        }}
      />

      <FederationConfirmIncomeDialog
        open={confirmIncomeTx != null}
        tx={confirmIncomeTx}
        federationSlug={federationSlug}
        defaultPaidDate={confirmIncomePaidDate}
        onClose={() => setConfirmIncomeTx(null)}
        onConfirmed={() => {
          aiSummaryCacheRef.current.clear();
          setAiSummary(null);
          setAiAnswer(null);
        }}
      />

      <FederationExpenseDialog
        open={openExpenseDialog}
        onClose={() => setOpenExpenseDialog(false)}
        federationSlug={federationSlug}
        defaultYear={filterYear}
        defaultMonth={filterMonth}
        competitions={competitions}
        presetCompetitionId={competitionScope || undefined}
        subsidyPaidIncomeOptions={subsidyPaidIncomeOptions}
        onRecorded={() => {
          aiSummaryCacheRef.current.clear();
          setAiSummary(null);
          setAiAnswer(null);
        }}
      />
      <div className="md:hidden h-28" />
    </div>
  );
}

function AnomalySeverityDot({
  severity,
  title,
  className = "",
}: {
  severity: AnomalyHintSeverity;
  title?: string;
  className?: string;
}) {
  const bg =
    severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-orange-400" : "bg-yellow-400";
  const label = severity === "high" ? "높음" : severity === "medium" ? "보통" : "낮음";
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${bg} ${className}`}
      title={title ?? `심각도 ${label}`}
      aria-hidden
    />
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "in" | "out" | "bal" | "rcv";
}) {
  const border =
    tone === "in"
      ? "border-emerald-100"
      : tone === "out"
        ? "border-rose-100"
        : tone === "rcv"
          ? "border-amber-100"
          : "border-slate-200";
  return (
    <div className={`rounded-xl border ${border} bg-white p-4 shadow-sm`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}
