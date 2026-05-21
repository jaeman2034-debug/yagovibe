import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  addTeamCashBookTransaction,
  generateTeamCashBookTxId,
  voidTeamCashBookTransaction,
} from "@/lib/team/teamCashBook";
import { storage } from "@/lib/firebase";
import { analyzeTeamExpenseReceipt } from "@/services/teamReceiptOcrService";
import { useTeamCashBook } from "../hooks/useTeamCashBook";
import { useTeamFees } from "@/features/fees/hooks/useTeamFees";
import { useFeePayments } from "@/features/fees/hooks/useFeePayments";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import { buildFeeMemberRows } from "@/features/fees/utils/feeDashboard";
import { notifyTeamMembers } from "@/services/platformNotificationService";
import { callReconcileCashBookForTeam } from "@/lib/team/reconcileCashBookForTeamCallable";
import { memberBillingLookupKeys } from "@/lib/team/memberBillingUid";
import type {
  TeamCashBookTransaction,
  TeamCashCategory,
  TeamCashExpenseCategory,
  TeamCashIncomeCategory,
  TeamCashKind,
} from "@/types/teamAccounting";
import {
  TEAM_CASH_EXPENSE_LABELS,
  TEAM_CASH_INCOME_LABELS,
  teamCashCategoryLabel,
} from "@/types/teamAccounting";
import TeamAccountingReportPrintable from "./TeamAccountingReportPrintable";

type Props = {
  teamId: string;
  teamName: string;
};

const INCOME_KEYS = Object.keys(TEAM_CASH_INCOME_LABELS) as TeamCashIncomeCategory[];
const EXPENSE_KEYS = Object.keys(TEAM_CASH_EXPENSE_LABELS) as TeamCashExpenseCategory[];

function formatMoney(n: number): string {
  return `₩ ${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

const MAX_OCR_AUTO_AMOUNT = 10_000_000;

function isPlausibleOcrAmount(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false;
  const a = Math.floor(Number(n));
  return a > 0 && a < MAX_OCR_AUTO_AMOUNT;
}

function isPlausibleOcrDate(ymd: string): boolean {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

function formatRelativeFromNow(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "-";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / (1000 * 60));
  if (m < 10) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function TeamAccountingDashboard({ teamId, teamName }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    summary,
    rows,
    monthSlice,
    monthIncome,
    monthExpense,
    incomeByCategory,
    expenseByCategory,
    prevExpenseByCategory,
    balanceDisplay,
    ledgerIncomeTotal,
    ledgerExpenseTotal,
    ledgerNet,
    balancePreferred,
    cashBookUiRowLimit,
    loading,
    error,
    monthQueryFailed,
    mealLoggedThisWeek,
    yesterdayMealSuggestion,
    monthlySummary,
    prevMonthlySummary,
  } = useTeamCashBook(teamId);

  const { fees, loading: feesLoading } = useTeamFees(teamId);
  const headFee = fees[0] ?? null;
  const { payments, loading: payLoading } = useFeePayments(teamId, headFee?.id);
  const { members, loading: memLoading } = useTeamMembers(teamId);

  const feeRows = useMemo(() => {
    if (!headFee) return [];
    return buildFeeMemberRows(members, payments, headFee.amount, headFee.dueDate, headFee.id);
  }, [headFee, members, payments]);

  const unpaidLikeCount = useMemo(
    () =>
      feeRows.filter(
        (r) => r.paymentStatus === "unpaid" || r.paymentStatus === "failed" || r.paymentStatus === "overdue"
      ).length,
    [feeRows]
  );

  const [sheet, setSheet] = useState<null | TeamCashKind>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TeamCashCategory>("meal");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [memo, setMemo] = useState("");
  const [occurredDate, setOccurredDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [saving, setSaving] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [receiptOcrMessage, setReceiptOcrMessage] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState(false);
  const [ocrAppliedFields, setOcrAppliedFields] = useState<{
    amount?: boolean;
    date?: boolean;
    category?: boolean;
  }>({});
  /** 저장 시 receipt에 같이 넣을 OCR 텍스트 스냅샷 */
  const [lastOcrRawText, setLastOcrRawText] = useState<string | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [memoTouched, setMemoTouched] = useState(false);
  const amountTouchedRef = useRef(false);
  const dateTouchedRef = useRef(false);
  const categoryTouchedRef = useRef(false);
  const memoTouchedRef = useRef(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reconcileNowBusy, setReconcileNowBusy] = useState(false);
  const [txHistoryExpanded, setTxHistoryExpanded] = useState(true);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    amountTouchedRef.current = amountTouched;
  }, [amountTouched]);
  useEffect(() => {
    dateTouchedRef.current = dateTouched;
  }, [dateTouched]);
  useEffect(() => {
    categoryTouchedRef.current = categoryTouched;
  }, [categoryTouched]);
  useEffect(() => {
    memoTouchedRef.current = memoTouched;
  }, [memoTouched]);

  const maxBar = Math.max(monthIncome, monthExpense, 1);
  const incomePct = Math.round((monthIncome / maxBar) * 100);
  const expensePct = Math.round((monthExpense / maxBar) * 100);
  const monthNet = monthIncome - monthExpense;

  const statusLine = useMemo(() => {
    if (monthExpense > monthIncome) {
      return { tone: "warn" as const, text: "⚠️ 이번달 적자 예상" };
    }
    return { tone: "ok" as const, text: "👍 정상 운영 중" };
  }, [monthExpense, monthIncome]);

  const showLowBalanceTodo =
    balancePreferred < Math.max(monthExpense * 0.3, 150_000) && monthExpense > monthIncome && monthExpense > 0;

  const monthSummaryFallback = useMemo(() => {
    const activeMembers = members.length;
    const avgExpensePerMember = activeMembers > 0 ? Math.round(monthExpense / activeMembers) : 0;
    const topExpense = expenseByCategory[0] ?? null;
    const topIncome = incomeByCategory[0] ?? null;
    return {
      activeMembers,
      avgExpensePerMember,
      topExpense,
      topIncome,
    };
  }, [members.length, monthExpense, expenseByCategory, incomeByCategory]);

  const contributionRowsFallback = useMemo(() => {
    const memberNameMap = new Map(members.map((m) => [m.uid, m.name]));
    const bucket = new Map<
      string,
      { uid: string; name: string; total: number; membership: number; donation: number }
    >();

    for (const tx of monthSlice) {
      if (tx.isDeleted) continue;
      if (tx.kind !== "income") continue;
      if (!tx.counterpartyUid) continue;
      if (tx.category !== "membership" && tx.category !== "donation" && tx.category !== "after_meal") continue;

      const uid = tx.counterpartyUid;
      const prev = bucket.get(uid) ?? {
        uid,
        name: memberNameMap.get(uid) || tx.counterpartyName || "이름없음",
        total: 0,
        membership: 0,
        donation: 0,
      };
      prev.total += tx.amount;
      if (tx.category === "membership") prev.membership += tx.amount;
      else prev.donation += tx.amount;
      if (!memberNameMap.get(uid) && tx.counterpartyName) prev.name = tx.counterpartyName;
      bucket.set(uid, prev);
    }
    return Array.from(bucket.values()).sort((a, b) => b.total - a.total);
  }, [monthSlice, members]);

  const reportTotalIncome = monthlySummary?.totalIncome ?? monthIncome;
  const reportTotalExpense = monthlySummary?.totalExpense ?? monthExpense;
  const reportNet = monthlySummary?.net ?? monthNet;

  /** 현금부 counterpartyUid는 Auth UID 또는 members 문서 ID 등 혼재 — 활성 멤버만 TOP에 포함 */
  const activeMemberBillingKeySet = useMemo(() => {
    const keys = new Set<string>();
    for (const m of members) {
      for (const k of memberBillingLookupKeys({
        uid: m.uid,
        linkedAuthUid: m.linkedAuthUid,
        memberDocumentId: m.memberDocumentId,
      })) {
        keys.add(k);
      }
    }
    return keys;
  }, [members]);

  const contributionRowsUnfiltered = monthlySummary?.memberContributionTop?.length
    ? monthlySummary.memberContributionTop
    : contributionRowsFallback;

  const contributionRows = useMemo(() => {
    if (memLoading) return contributionRowsUnfiltered;
    return contributionRowsUnfiltered.filter((r) => activeMemberBillingKeySet.has(r.uid));
  }, [contributionRowsUnfiltered, activeMemberBillingKeySet, memLoading]);
  const reportTopIncomeCategory = monthlySummary?.topIncomeCategory ?? monthSummaryFallback.topIncome?.[0] ?? null;
  const reportTopExpenseCategory = monthlySummary?.topExpenseCategory ?? monthSummaryFallback.topExpense?.[0] ?? null;
  const reportTopIncomeAmount = monthlySummary?.topIncomeCategory
    ? incomeByCategory.find(([k]) => k === monthlySummary.topIncomeCategory)?.[1] ?? 0
    : monthSummaryFallback.topIncome?.[1] ?? 0;
  const reportTopExpenseAmount = monthlySummary?.topExpenseCategory
    ? expenseByCategory.find(([k]) => k === monthlySummary.topExpenseCategory)?.[1] ?? 0
    : monthSummaryFallback.topExpense?.[1] ?? 0;
  const reportAvgExpensePerMember = monthSummaryFallback.avgExpensePerMember;

  const monthCompare = useMemo(() => {
    if (!prevMonthlySummary) return null;
    const prevNet = prevMonthlySummary.net;
    const prevExpense = prevMonthlySummary.totalExpense;
    const netDiff = reportNet - prevNet;
    const expenseDiff = reportTotalExpense - prevExpense;
    const netRate = prevNet !== 0 ? (netDiff / Math.abs(prevNet)) * 100 : null;
    const expenseRate = prevExpense !== 0 ? (expenseDiff / Math.abs(prevExpense)) * 100 : null;
    return {
      prevMonthId: prevMonthlySummary.monthId,
      netDiff,
      expenseDiff,
      netRate,
      expenseRate,
    };
  }, [prevMonthlySummary, reportNet, reportTotalExpense]);

  /** 요약 잔액 vs 대시보드에 올라온 최근 N건 샘플 순액 — 서로 다른 정의(차이만으로 이중기록 판단 금지) */
  const ledgerSampleBreakdown = useMemo(() => {
    if (summary == null || rows.length === 0) return null;
    return {
      totalBalance: balanceDisplay,
      sampleNet: ledgerNet,
      gap: balanceDisplay - ledgerNet,
    };
  }, [summary, rows.length, balanceDisplay, ledgerNet]);

  const expenseCategoryTrends = useMemo(() => {
    const cur = new Map<string, number>(expenseByCategory);
    const prev = new Map<string, number>(prevExpenseByCategory);
    const cats = new Set<string>([...cur.keys(), ...prev.keys()]);
    const rows = Array.from(cats).map((cat) => {
      const currentAmount = cur.get(cat) ?? 0;
      const prevAmount = prev.get(cat) ?? 0;
      const diff = currentAmount - prevAmount;
      const rate = prevAmount > 0 ? (diff / prevAmount) * 100 : null;
      return { category: cat, currentAmount, prevAmount, diff, rate, absDiff: Math.abs(diff) };
    });
    const increases = rows
      .filter((r) => r.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
    const decreases = rows
      .filter((r) => r.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);
    return { increases, decreases };
  }, [expenseByCategory, prevExpenseByCategory]);

  const reconcileBadge = useMemo(() => {
    const iso = summary?.reconciledAt;
    const reconDelta = summary?.lastReconciledDelta;
    const reconTx = summary?.lastReconciledTxCount;
    const deltaHint =
      typeof reconDelta === "number" &&
      Number.isFinite(reconDelta) &&
      reconDelta !== 0 &&
      typeof reconTx === "number"
        ? ` · 최근 정합 시 요약 잔액 ${reconDelta > 0 ? "+" : ""}${formatMoney(reconDelta)} 조정(원장 ${reconTx}건 스캔)`
        : "";
    if (!iso) {
      return {
        tone: "red" as const,
        dot: "🔴",
        text: "검증 필요",
        detail: `마지막 검증 정보 없음${deltaHint}`,
      };
    }
    const diffMs = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return {
        tone: "yellow" as const,
        dot: "🟡",
        text: "검증 지연",
        detail: "검증 시각 파싱 실패",
      };
    }
    const sixHours = 6 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    if (diffMs <= sixHours) {
      return {
        tone: "green" as const,
        dot: "🟢",
        text: "정상",
        detail: `마지막 검증: ${formatRelativeFromNow(iso)}${deltaHint}`,
      };
    }
    if (diffMs <= oneDay) {
      return {
        tone: "yellow" as const,
        dot: "🟡",
        text: "지연",
        detail: `마지막 검증: ${formatRelativeFromNow(iso)}${deltaHint}`,
      };
    }
    return {
      tone: "red" as const,
      dot: "🔴",
      text: "검증 필요",
      detail: `마지막 검증: ${formatRelativeFromNow(iso)}${deltaHint}`,
    };
  }, [summary?.reconciledAt, summary?.lastReconciledDelta, summary?.lastReconciledTxCount]);

  const openSheet = (kind: TeamCashKind, preset?: TeamCashExpenseCategory | TeamCashIncomeCategory) => {
    setSheet(kind);
    setAmount("");
    setMemo("");
    setCounterpartyName("");
    setReceiptFile(null);
    setIsOcrLoading(false);
    setReceiptOcrMessage(null);
    setOcrError(false);
    setOcrAppliedFields({});
    setLastOcrRawText(null);
    setAmountTouched(false);
    setDateTouched(false);
    setCategoryTouched(false);
    setMemoTouched(false);
    const d = new Date();
    setOccurredDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    if (kind === "income") {
      setCategory((preset as TeamCashIncomeCategory) ?? "membership");
    } else {
      setCategory(preset ?? "meal");
    }
  };

  const openSheetWithAmount = (
    kind: TeamCashKind,
    cat: TeamCashCategory,
    presetAmount: number,
    presetMemo?: string
  ) => {
    setSheet(kind);
    setCategory(cat);
    setAmount(String(presetAmount));
    setMemo(presetMemo ?? "");
    setCounterpartyName("");
    setReceiptFile(null);
    setIsOcrLoading(false);
    setReceiptOcrMessage(null);
    setOcrError(false);
    setOcrAppliedFields({});
    setLastOcrRawText(null);
    setAmountTouched(false);
    setDateTouched(false);
    setCategoryTouched(false);
    setMemoTouched(false);
    const d = new Date();
    setOccurredDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  };

  const submitSheet = async () => {
    if (!user?.uid || !sheet) return;
    const n = Number(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("금액을 입력해 주세요.");
      return;
    }
    const [y, m, day] = occurredDate.split("-").map(Number);
    const occurredAt = new Date(y, (m ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
    if (Number.isNaN(occurredAt.getTime())) {
      toast.error("날짜가 올바르지 않습니다.");
      return;
    }
    setSaving(true);
    try {
      let nextReceipt:
        | {
            imageUrl: string;
            uploadedByUid: string;
            uploadedAt: Date;
            ocrRawText?: string;
          }
        | undefined;
      let txId: string | undefined;
      if (sheet === "expense" && receiptFile) {
        if (!receiptFile.type.startsWith("image/")) {
          toast.error("이미지 파일만 영수증으로 업로드할 수 있어요.");
          setSaving(false);
          return;
        }
        if (receiptFile.size > 10 * 1024 * 1024) {
          toast.error("영수증 이미지는 10MB 이하만 업로드할 수 있어요.");
          setSaving(false);
          return;
        }
        txId = generateTeamCashBookTxId(teamId);
        const ext = receiptFile.name.includes(".") ? receiptFile.name.split(".").pop() || "jpg" : "jpg";
        const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const storageRef = ref(storage, `teams/${teamId}/receipts/${txId}.${cleanExt}`);
        await uploadBytes(storageRef, receiptFile, { contentType: receiptFile.type || "image/jpeg" });
        const imageUrl = await getDownloadURL(storageRef);
        nextReceipt = {
          imageUrl,
          uploadedByUid: user.uid,
          uploadedAt: new Date(),
          ...(lastOcrRawText && lastOcrRawText.length > 0
            ? { ocrRawText: lastOcrRawText.length > 2000 ? lastOcrRawText.slice(0, 2000) : lastOcrRawText }
            : {}),
        };
      }

      await addTeamCashBookTransaction(teamId, user.uid, {
        kind: sheet,
        category,
        amount: n,
        occurredAt,
        memo: memo.trim() || undefined,
        counterpartyName: counterpartyName.trim() || undefined,
        txId,
        receipt: nextReceipt,
      });
      toast.success("기록했습니다.");
      setSheet(null);
      setReceiptFile(null);
      setOcrAppliedFields({});
      setOcrError(false);
      setLastOcrRawText(null);
      setReceiptOcrMessage(null);
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleReceiptFileChange = async (file: File | null) => {
    setReceiptFile(file);
    setReceiptOcrMessage(null);
    setOcrError(false);
    setOcrAppliedFields({});
    setLastOcrRawText(null);
    if (!file) return;
    if (sheet !== "expense") return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 영수증으로 업로드할 수 있어요.");
      setReceiptOcrMessage("이미지 파일을 선택해 주세요.");
      setOcrError(true);
      return;
    }
    setIsOcrLoading(true);
    setReceiptOcrMessage("영수증 분석 중...");
    toast.message("영수증 분석 중…");
    try {
      const result = await analyzeTeamExpenseReceipt(teamId, file);
      if (!result.success) {
        setOcrError(true);
        setReceiptOcrMessage(null);
        toast.warning(result.error);
        return;
      }
      setLastOcrRawText(result.rawText?.length ? result.rawText : null);
      const conf = result.confidence;
      const applied: { amount?: boolean; date?: boolean; category?: boolean } = {};

      const canFillLoose = conf >= 0.4;
      const canFillDate = conf >= 0.45;
      const canFillCategory = conf >= 0.5;
      const canFillMemo = conf >= 0.5;

      if (canFillLoose && !amountTouchedRef.current && result.amount != null && isPlausibleOcrAmount(result.amount)) {
        setAmount(String(Math.floor(result.amount)));
        applied.amount = true;
      }
      if (canFillDate && !dateTouchedRef.current && result.date && isPlausibleOcrDate(result.date)) {
        setOccurredDate(result.date);
        applied.date = true;
      }
      if (canFillCategory && !categoryTouchedRef.current && result.category) {
        setCategory(result.category);
        applied.category = true;
      }
      if (canFillMemo && !memoTouchedRef.current && result.rawText) {
        const line = result.rawText.split("\n")[0]?.trim() || "";
        if (line) setMemo(line.slice(0, 120));
      }

      setOcrAppliedFields(applied);

      const anyApplied = !!(applied.amount || applied.date || applied.category);
      if (conf < 0.35 && !anyApplied) {
        setReceiptOcrMessage("자동으로 채울 수 있는 항목이 없습니다. 직접 입력해 주세요.");
        toast.message("자동 인식이 불확실합니다. 직접 입력을 권장해요.");
      } else if (!anyApplied) {
        setReceiptOcrMessage("확실한 항목만 자동 반영됩니다. 나머지는 직접 입력해 주세요.");
        toast.message("일부 항목만 인식됐을 수 있어요. 직접 확인해 주세요.");
      } else {
        setReceiptOcrMessage("자동 입력된 항목은 아래 힌트를 확인하고 수정해 주세요.");
        toast.success("자동 입력을 반영했어요. 값을 꼭 확인해 주세요.");
      }
    } catch (e) {
      console.error(e);
      setOcrError(true);
      setReceiptOcrMessage(null);
      setLastOcrRawText(null);
      toast.error("영수증을 읽는 중 오류가 났어요. 직접 입력해 주세요.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const quickAdd = async (kind: TeamCashKind, cat: TeamCashCategory, presetAmt: number, label?: string) => {
    if (!user?.uid) return;
    setQuickBusy(true);
    try {
      await addTeamCashBookTransaction(teamId, user.uid, {
        kind,
        category: cat,
        amount: presetAmt,
        occurredAt: new Date(),
        memo: label,
      });
      toast.success("기록했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했습니다.");
    } finally {
      setQuickBusy(false);
    }
  };

  const handleVoid = async (tx: TeamCashBookTransaction) => {
    if (!user?.uid || tx.isDeleted) return;
    const reason = window.prompt("무효 사유(선택, 감사 기록용)") ?? "";
    if (!window.confirm("이 거래를 무효 처리할까요? 잔액이 되돌아갑니다.")) return;
    setVoidingId(tx.id);
    try {
      await voidTeamCashBookTransaction(teamId, tx.id, user.uid, reason.trim() || undefined);
      toast.success("무효 처리했습니다.");
    } catch (e) {
      console.error(e);
      toast.error("무효 처리에 실패했습니다.");
    } finally {
      setVoidingId(null);
    }
  };

  const handleReconcileNow = async () => {
    if (!teamId?.trim() || reconcileNowBusy) return;
    setReconcileNowBusy(true);
    try {
      const r = await callReconcileCashBookForTeam(teamId);
      if (r.balanceCorrected) {
        toast.success(
          `요약 잔액을 원장 합계에 맞췄습니다. (차이 ${r.delta >= 0 ? "+" : ""}${r.delta.toLocaleString("ko-KR")}원 · 거래 ${r.txCount}건)`
        );
      } else {
        toast.success(`원장 ${r.txCount}건과 요약 잔액이 일치합니다. 검증 시각을 갱신했습니다.`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "정합 실행에 실패했습니다.";
      toast.error(msg);
    } finally {
      setReconcileNowBusy(false);
    }
  };

  const sendShortfallNotice = async () => {
    try {
      await notifyTeamMembers(teamId, {
        type: "SYSTEM_NOTICE",
        title: `${teamName} 팀비·회계 안내`,
        message: `안녕하세요. 이번 달 팀 지출이 수입보다 많아 팀 통장 잔액이 빠르게 줄고 있습니다. 여유가 되시는 분들의 찬조·납부 부탁드립니다. (총무 ${teamName})`,
      });
      toast.success("팀원에게 알림을 보냈어요.");
    } catch {
      toast.error("알림 발송에 실패했습니다.");
    }
  };

  const suggestMealToday =
    !mealLoggedThisWeek && (new Date().getDay() === 0 || new Date().getDay() === 6 || new Date().getHours() >= 17);

  const currentMonthId =
    monthlySummary?.monthId ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const reportCompareText = monthCompare
    ? `전월(${monthCompare.prevMonthId}) 대비 순증감 ${
        monthCompare.netDiff >= 0 ? "증가" : "감소"
      } ${formatMoney(Math.abs(monthCompare.netDiff))}, 지출 ${
        monthCompare.expenseDiff >= 0 ? "증가" : "감소"
      } ${formatMoney(Math.abs(monthCompare.expenseDiff))}`
    : "전월 비교 데이터 없음";

  const handleDownloadPdf = async () => {
    const target = reportPrintRef.current;
    if (!target) return;
    setDownloadingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const sanitizeOklchStyles = (doc: Document) => {
        const nodes = doc.querySelectorAll<HTMLElement>("*");
        nodes.forEach((el) => {
          const style = doc.defaultView?.getComputedStyle(el);
          if (!style) return;
          const replaceIfOklch = (value: string, fallback: string) =>
            value.includes("oklch(") ? fallback : value;
          el.style.color = replaceIfOklch(style.color, "rgb(15, 23, 42)");
          el.style.backgroundColor = replaceIfOklch(style.backgroundColor, "rgba(0, 0, 0, 0)");
          el.style.borderColor = replaceIfOklch(style.borderColor, "rgb(203, 213, 225)");
          el.style.outlineColor = replaceIfOklch(style.outlineColor, "rgb(203, 213, 225)");
          el.style.textDecorationColor = replaceIfOklch(style.textDecorationColor, "rgb(15, 23, 42)");
        });
      };
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          sanitizeOklchStyles(clonedDoc);
        },
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let position = 0;
        let remaining = imgHeight;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        remaining -= pageHeight;

        while (remaining > 0) {
          position = remaining - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          remaining -= pageHeight;
        }
      }

      pdf.save(`${teamName}_${currentMonthId}_회계리포트.pdf`);
      toast.success("리포트가 다운로드되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("PDF 생성에 실패했습니다.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 sm:max-w-none">
      {monthQueryFailed && (
        <p className="text-xs text-amber-700">
          이번 달 집계 쿼리에 실패해 최근 목록 기준으로 표시합니다. 인덱스 배포 후 자동 복구됩니다.
        </p>
      )}

      {/* 1 잔액 요약 — cashBookSummary 우선, 없으면 로드된 원장 합계 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">현재 잔액 (수입 − 지출)</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {formatMoney(balancePreferred)}
        </p>
        {summary == null && rows.length > 0 && (
          <p className="mt-1 text-[11px] text-slate-500">
            요약 문서가 없어, 아래에 로드된 거래만으로 순액을 계산했습니다. Functions가 회비 반영 시 요약도 같이
            만듭니다.
          </p>
        )}
        {ledgerSampleBreakdown ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 text-[11px] leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-800">
                최근 거래 부분 합계 (최근 {cashBookUiRowLimit}건 기준 · 전체 잔액 아님)
              </p>
              <p className="mt-1 text-slate-600">
                아래「샘플 순액」은 화면이 구독하는 최신 <strong>{cashBookUiRowLimit}건</strong>만의 수입−지출
                합입니다. 맨 위 잔액은 요약 문서의 <strong>전체 누적</strong>입니다.
              </p>
              <dl className="mt-2 grid grid-cols-1 gap-1.5 border-t border-slate-200/80 pt-2 sm:grid-cols-3 sm:gap-2">
                <div>
                  <dt className="text-slate-500">전체 잔액 (요약)</dt>
                  <dd className="font-bold tabular-nums text-slate-900">
                    {formatMoney(ledgerSampleBreakdown.totalBalance)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">최근 {cashBookUiRowLimit}건 합</dt>
                  <dd className="font-bold tabular-nums text-slate-900">
                    {formatMoney(ledgerSampleBreakdown.sampleNet)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">차이 (요약 − 샘플)</dt>
                  <dd
                    className={`font-bold tabular-nums ${
                      Math.abs(ledgerSampleBreakdown.gap) > 1 ? "text-indigo-800" : "text-slate-800"
                    }`}
                  >
                    {ledgerSampleBreakdown.gap > 0 ? "+" : ""}
                    {formatMoney(ledgerSampleBreakdown.gap)}
                    <span className="ml-1 text-[10px] font-normal text-slate-500">
                      (위 {cashBookUiRowLimit}건 밖 거래의 순효과)
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/teams/${encodeURIComponent(teamId)}/cash-book`)}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-950 shadow-sm transition hover:bg-indigo-100 sm:w-auto"
            >
              전체 거래 조회 (페이지네이션)
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="text-emerald-700">+ 수입 {formatMoney(monthIncome)}</span>
          <span className="text-rose-700">− 지출 {formatMoney(monthExpense)}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          이번 달 수입/지출 위 ·{" "}
          <strong>최근 거래 요약 (최근 {cashBookUiRowLimit}건 기준 · 전체 잔액 아님)</strong> — 수입{" "}
          {formatMoney(ledgerIncomeTotal)} / 지출 {formatMoney(ledgerExpenseTotal)}
        </p>
        <p
          className={`mt-3 text-sm font-semibold ${
            statusLine.tone === "warn" ? "text-amber-800" : "text-emerald-800"
          }`}
        >
          {statusLine.text}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
              reconcileBadge.tone === "green"
                ? "bg-emerald-50 text-emerald-800"
                : reconcileBadge.tone === "yellow"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-rose-50 text-rose-800"
            }`}
          >
            <span>{reconcileBadge.dot}</span>
            <span>{reconcileBadge.text}</span>
            <span className="text-[11px] opacity-80">{reconcileBadge.detail}</span>
          </div>
          <button
            type="button"
            disabled={reconcileNowBusy || !teamId}
            onClick={() => void handleReconcileNow()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {reconcileNowBusy ? "원장 정합 실행 중…" : "요약 잔액 지금 맞추기"}
          </button>
          <p className="text-[10px] leading-snug text-slate-500 sm:max-w-md">
            원장 전체를 스캔해 요약과 비교합니다. 이미 일치하면 잔액은 그대로 두고 검증 시각만 갱신합니다.
          </p>
        </div>
      </section>

      {/* 2 이번 달 흐름 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">이번 달 흐름</h2>
        <p className="mt-1 text-xs text-slate-500">수입 vs 지출 (막대는 비율만 표시, 무효 거래 제외)</p>
        <div className="mt-4 space-y-2">
          <div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>수입</span>
              <span>{formatMoney(monthIncome)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>지출</span>
              <span>{formatMoney(monthExpense)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${expensePct}%` }} />
            </div>
          </div>
        </div>

        {incomeByCategory.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-slate-700">수입 구성</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {incomeByCategory.map(([cat, val]) => (
                <li key={cat} className="flex justify-between gap-2">
                  <span>{teamCashCategoryLabel("income", cat as TeamCashCategory)}</span>
                  <span className="tabular-nums text-emerald-700">{formatMoney(val)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {expenseByCategory.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-700">지출 구성</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {expenseByCategory.map(([cat, val]) => (
                <li key={cat} className="flex justify-between gap-2">
                  <span>{teamCashCategoryLabel("expense", cat as TeamCashCategory)}</span>
                  <span className="tabular-nums text-rose-700">{formatMoney(val)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 2.5 이번 달 리포트 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">이번 달 리포트</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{monthlySummary ? "서버 집계" : "실시간 계산"}</span>
            <button
              type="button"
              disabled={downloadingPdf}
              onClick={handleDownloadPdf}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPdf ? "생성 중..." : "📄 리포트 다운로드"}
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">수입</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{formatMoney(reportTotalIncome)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">지출</p>
            <p className="mt-1 text-lg font-bold text-rose-700">{formatMoney(reportTotalExpense)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">잔액 변화</p>
            <p className={`mt-1 text-lg font-bold ${reportNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {reportNet >= 0 ? "+" : ""}
              {formatMoney(reportNet)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">1인 평균 비용</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {monthSummaryFallback.activeMembers > 0 ? formatMoney(reportAvgExpensePerMember) : "-"}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <p>
            주요 지출:{" "}
            {reportTopExpenseCategory
              ? `${teamCashCategoryLabel("expense", reportTopExpenseCategory as TeamCashCategory)} ${formatMoney(
                  reportTopExpenseAmount
                )}`
              : "-"}
          </p>
          <p>
            주요 수입:{" "}
            {reportTopIncomeCategory
              ? `${teamCashCategoryLabel("income", reportTopIncomeCategory as TeamCashCategory)} ${formatMoney(
                  reportTopIncomeAmount
                )}`
              : "-"}
          </p>
          {monthlySummary?.updatedAt && (
            <p className="text-[11px] text-slate-500">서버 집계 갱신: {formatRelativeFromNow(monthlySummary.updatedAt)}</p>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
          {monthCompare ? (
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">전월({monthCompare.prevMonthId}) 대비</p>
              <p className={monthCompare.netDiff >= 0 ? "text-emerald-700" : "text-rose-700"}>
                순증감 {monthCompare.netDiff >= 0 ? "↑" : "↓"} {formatMoney(monthCompare.netDiff)}
                {monthCompare.netRate != null ? ` (${monthCompare.netRate >= 0 ? "+" : ""}${monthCompare.netRate.toFixed(1)}%)` : ""}
              </p>
              <p className={monthCompare.expenseDiff <= 0 ? "text-emerald-700" : "text-amber-700"}>
                지출 변화 {monthCompare.expenseDiff <= 0 ? "↓" : "↑"} {formatMoney(monthCompare.expenseDiff)}
                {monthCompare.expenseRate != null
                  ? ` (${monthCompare.expenseRate >= 0 ? "+" : ""}${monthCompare.expenseRate.toFixed(1)}%)`
                  : ""}
              </p>
              <p className={monthCompare.expenseDiff <= 0 ? "text-emerald-700" : "text-amber-700"}>
                {monthCompare.expenseDiff <= 0 ? "👍 지출 감소" : "⚠️ 지출 증가"}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">전월 비교 데이터 없음</p>
          )}
        </div>
      </section>

      {/* 2.7 카테고리 추세 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">카테고리 추세 (지출)</h2>
        {expenseCategoryTrends.increases.length === 0 && expenseCategoryTrends.decreases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">전월 대비 비교할 지출 카테고리가 없습니다.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <p className="text-xs font-semibold text-rose-800">증가 TOP 3</p>
              {expenseCategoryTrends.increases.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">증가한 카테고리 없음</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {expenseCategoryTrends.increases.map((r) => (
                    <li key={`inc-${r.category}`} className="rounded-lg bg-white/70 p-2 text-xs">
                      <p className="font-semibold text-slate-800">
                        {teamCashCategoryLabel("expense", r.category as TeamCashCategory)}
                      </p>
                      <p className="text-slate-600">
                        {formatMoney(r.prevAmount)} → {formatMoney(r.currentAmount)}
                      </p>
                      <p className="font-semibold text-rose-700">
                        ↑ {formatMoney(r.diff)}
                        {r.rate != null ? ` (+${r.rate.toFixed(1)}%)` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="text-xs font-semibold text-emerald-800">감소 TOP 3</p>
              {expenseCategoryTrends.decreases.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">감소한 카테고리 없음</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {expenseCategoryTrends.decreases.map((r) => (
                    <li key={`dec-${r.category}`} className="rounded-lg bg-white/70 p-2 text-xs">
                      <p className="font-semibold text-slate-800">
                        {teamCashCategoryLabel("expense", r.category as TeamCashCategory)}
                      </p>
                      <p className="text-slate-600">
                        {formatMoney(r.prevAmount)} → {formatMoney(r.currentAmount)}
                      </p>
                      <p className="font-semibold text-emerald-700">
                        ↓ {formatMoney(Math.abs(r.diff))}
                        {r.rate != null ? ` (${r.rate.toFixed(1)}%)` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2.6 멤버 기여도 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">멤버 기여도 TOP</h2>
          <span className="text-[11px] text-slate-500">회비 + 찬조 기준</span>
        </div>
        {contributionRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">아직 집계할 기여 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-semibold text-amber-800">🏆 이번달 최고 기여자</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{contributionRows[0].name}</p>
              <p className="text-xs text-slate-600">{formatMoney(contributionRows[0].total)}</p>
            </div>
            <ul className="mt-2 space-y-2">
            {contributionRows.slice(0, 5).map((r, idx) => (
              <li
                key={r.uid}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {idx + 1}. {r.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    회비 {formatMoney(r.membership)} + 찬조 {formatMoney(r.donation)}
                  </p>
                </div>
                <p className="ml-3 shrink-0 text-sm font-bold text-emerald-700">{formatMoney(r.total)}</p>
              </li>
            ))}
            </ul>
          </>
        )}
      </section>

      {/* 3 지금 해야 할 것 */}
      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">지금 해야 할 것</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {headFee && unpaidLikeCount > 0 && (
            <li className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-amber-950">⚠️ 회비 미납·연체 {unpaidLikeCount}명</span>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                onClick={() => navigate(`/teams/${teamId}/manage?tab=fees`)}
              >
                독촉·납부 확인하기
              </button>
            </li>
          )}
          {!headFee && !feesLoading && (
            <li className="rounded-xl border border-slate-200 bg-white/80 p-3 text-slate-700">
              등록된 회비가 없어요. <strong>회비 관리</strong> 탭에서 회비를 만들면 미납 인원을 여기서 안내합니다.
            </li>
          )}
          {headFee && unpaidLikeCount === 0 && !feesLoading && !payLoading && !memLoading && (
            <li className="rounded-xl border border-slate-200 bg-white/80 p-3 text-slate-700">
              ✅ 최근 회비 기준으로는 미납이 없어요.
            </li>
          )}
          {!mealLoggedThisWeek && (
            <li className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-amber-950">⚠️ 최근 7일간 식사/음료 지출이 없어요</span>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => openSheet("expense", "meal")}
              >
                지출 입력하기
              </button>
            </li>
          )}
          {showLowBalanceTodo && (
            <li className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-rose-900">⚠️ 잔액이 빠듯해 보여요</span>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                onClick={() => sendShortfallNotice()}
              >
                공지 알림 보내기
              </button>
            </li>
          )}
        </ul>
        {yesterdayMealSuggestion && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-700">
              어제와 같은 식사({yesterdayMealSuggestion.amount.toLocaleString("ko-KR")}원) 기록할까요?
            </p>
            <button
              type="button"
              disabled={quickBusy}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() =>
                quickAdd(
                  "expense",
                  "meal",
                  yesterdayMealSuggestion.amount,
                  yesterdayMealSuggestion.memo ?? "어제와 동일"
                )
              }
            >
              한 번에 기록
            </button>
          </div>
        )}
        {suggestMealToday && (
          <p className="mt-3 text-xs text-amber-900/90">
            오늘도 운동 후 식사를 기록하시겠어요? 아래 <strong>오늘 식사 입력</strong>이나 프리셋을 눌러 3초 만에 남겨두세요.
          </p>
        )}
      </section>

      {/* 4 거래 내역 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="거래 내역">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">거래 내역</h2>
            <p className="mt-1 text-xs text-slate-500">무효된 건은 회색으로 남고, 잔액·월 집계에서는 제외됩니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setTxHistoryExpanded((v) => !v)}
            aria-expanded={txHistoryExpanded}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <span>{txHistoryExpanded ? "접기" : "펼치기"}</span>
            <svg
              className={`h-4 w-4 text-slate-600 transition-transform duration-200 ${txHistoryExpanded ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        {!txHistoryExpanded && (
          <p className="mt-3 text-xs text-slate-500">
            목록 숨김 · 총 <span className="font-semibold tabular-nums text-slate-700">{rows.length}</span>건
          </p>
        )}
        {txHistoryExpanded && loading && <p className="mt-3 text-sm text-slate-500">불러오는 중…</p>}
        {txHistoryExpanded && !loading && rows.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">아직 기록이 없습니다. 첫 수입·지출을 남겨 보세요.</p>
        )}
        {txHistoryExpanded && (
        <ul className="mt-3 space-y-2">
          {rows.map((tx) => {
            const sign = tx.kind === "income" ? "+" : "−";
            const tone = tx.isDeleted ? "text-slate-400 line-through" : tx.kind === "income" ? "text-emerald-700" : "text-rose-700";
            const title = teamCashCategoryLabel(tx.kind, tx.category);
            const sub =
              tx.kind === "income"
                ? tx.counterpartyName || "수입"
                : tx.memo?.trim() || title;
            return (
              <li
                key={tx.id}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-3 ${
                  tx.isDeleted ? "border-slate-100 bg-slate-50" : "border-slate-100 bg-slate-50/80"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-lg font-bold tabular-nums ${tone}`}>
                    {sign}
                    {tx.amount.toLocaleString("ko-KR")}원
                  </p>
                  <p className={`text-sm font-medium ${tx.isDeleted ? "text-slate-400" : "text-slate-800"}`}>
                    {title}
                    {tx.isDeleted && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        무효
                      </span>
                    )}
                  </p>
                  <p className={`truncate text-xs ${tx.isDeleted ? "text-slate-400" : "text-slate-500"}`}>{sub}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDay(tx.occurredAt)}</p>
                  {!!tx.receipt?.imageUrl && (
                    <a
                      href={tx.receipt.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      📎 영수증 보기
                    </a>
                  )}
                </div>
                {!tx.isDeleted && (
                  <button
                    type="button"
                    disabled={voidingId === tx.id}
                    className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
                    onClick={() => handleVoid(tx)}
                  >
                    {voidingId === tx.id ? "처리 중" : "무효"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        )}
      </section>

      {/* 프리셋 빠른 입력 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-800">금액 프리셋</p>
        <p className="mt-0.5 text-[11px] text-slate-500">자주 쓰는 패턴을 한 탭으로 남깁니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={quickBusy}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            onClick={() => quickAdd("income", "membership", 30_000, "월 회비")}
          >
            ＋3만 회비
          </button>
          <button
            type="button"
            disabled={quickBusy}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            onClick={() => quickAdd("income", "donation", 20_000, "찬조")}
          >
            ＋2만 찬조
          </button>
          <button
            type="button"
            disabled={quickBusy}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
            onClick={() => quickAdd("expense", "meal", 20_000, "식사")}
          >
            🍗 식사 2만
          </button>
          <button
            type="button"
            disabled={quickBusy}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
            onClick={() => quickAdd("expense", "meal", 30_000, "식사")}
          >
            🍗 식사 3만
          </button>
        </div>
      </div>

      {/* 5 빠른 입력 */}
      <div className="sticky bottom-3 z-10 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
          onClick={() => openSheet("income")}
        >
          ＋ 수입 추가
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-rose-700"
          onClick={() => openSheet("expense")}
        >
          － 지출 추가
        </button>
      </div>
      <button
        type="button"
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        onClick={() => openSheetWithAmount("expense", "meal", 20_000)}
      >
        🍗 오늘 식사 입력 (2만)
      </button>

      {/* 바텀시트 */}
      {sheet && (
        <>
          <div className="fixed inset-0 z-[100001] bg-black/40" onClick={() => !saving && setSheet(null)} aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-[100002] max-h-[88vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 pb-8 shadow-2xl sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <h3 className="text-lg font-bold text-slate-900">{sheet === "income" ? "수입 기록" : "지출 기록"}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                금액
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
                  value={amount}
                  onChange={(e) => {
                    setAmountTouched(true);
                    setOcrAppliedFields((p) => ({ ...p, amount: false }));
                    setAmount(e.target.value);
                  }}
                  placeholder="예: 30000"
                />
                {ocrAppliedFields.amount ? (
                  <p className="mt-1 text-[11px] text-indigo-600">자동 인식된 값입니다. 수정할 수 있어요.</p>
                ) : null}
              </label>
              <label className="block text-xs font-medium text-slate-600">
                날짜
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={occurredDate}
                  onChange={(e) => {
                    setDateTouched(true);
                    setOcrAppliedFields((p) => ({ ...p, date: false }));
                    setOccurredDate(e.target.value);
                  }}
                />
                {ocrAppliedFields.date ? (
                  <p className="mt-1 text-[11px] text-indigo-600">자동 인식된 날짜입니다. 필요 시 바꿔 주세요.</p>
                ) : null}
              </label>
              <label className="block text-xs font-medium text-slate-600">
                카테고리
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={category}
                  onChange={(e) => {
                    setCategoryTouched(true);
                    setOcrAppliedFields((p) => ({ ...p, category: false }));
                    setCategory(e.target.value as TeamCashCategory);
                  }}
                >
                  {sheet === "income"
                    ? INCOME_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {TEAM_CASH_INCOME_LABELS[k]}
                        </option>
                      ))
                    : EXPENSE_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {TEAM_CASH_EXPENSE_LABELS[k]}
                        </option>
                      ))}
                </select>
                {ocrAppliedFields.category && sheet === "expense" ? (
                  <p className="mt-1 text-[11px] text-indigo-600">자동 분류되었습니다. 틀리면 바로 고쳐 주세요.</p>
                ) : null}
              </label>
              {sheet === "income" && (
                <label className="block text-xs font-medium text-slate-600">
                  이름 (선택)
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    placeholder="납부·찬조자"
                  />
                </label>
              )}
              <label className="block text-xs font-medium text-slate-600">
                메모
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={memo}
                  onChange={(e) => {
                    setMemoTouched(true);
                    setMemo(e.target.value);
                  }}
                  placeholder="내용을 짧게 남겨 주세요"
                />
              </label>
              {sheet === "expense" && (
                <label className="block text-xs font-medium text-slate-600">
                  영수증 추가 (선택)
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    disabled={isOcrLoading}
                    onChange={(e) => {
                      void handleReceiptFileChange(e.target.files?.[0] ?? null);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {receiptFile ? `선택됨: ${receiptFile.name}` : "최대 10MB 이미지"}
                  </p>
                  {isOcrLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
                        aria-hidden
                      />
                      <span>영수증 분석 중…</span>
                    </div>
                  ) : null}
                  <p className="mt-1 text-[11px] text-indigo-600">
                    {receiptOcrMessage ?? "이미지를 선택하면 금액·날짜·카테고리를 자동으로 채울 수 있어요 (확실한 항목만)."}
                  </p>
                  {ocrError ? (
                    <p className="mt-2 text-sm text-red-600">
                      영수증을 정확히 읽지 못했어요. 직접 입력해 주세요.
                    </p>
                  ) : null}
                </label>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
                disabled={saving || isOcrLoading}
                onClick={() => setSheet(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
                disabled={saving || isOcrLoading}
                onClick={() => submitSheet()}
              >
                {isOcrLoading ? "영수증 분석 중…" : saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="pointer-events-none fixed -left-[99999px] top-0 opacity-0" aria-hidden>
        <div ref={reportPrintRef}>
          <TeamAccountingReportPrintable
            teamName={teamName}
            monthLabel={currentMonthId}
            generatedAtLabel={new Date().toLocaleString("ko-KR")}
            totalIncome={formatMoney(reportTotalIncome)}
            totalExpense={formatMoney(reportTotalExpense)}
            net={`${reportNet >= 0 ? "+" : ""}${formatMoney(reportNet)}`}
            avgExpensePerMember={
              monthSummaryFallback.activeMembers > 0 ? formatMoney(reportAvgExpensePerMember) : "데이터 없음"
            }
            topIncomeText={
              reportTopIncomeCategory
                ? `${teamCashCategoryLabel("income", reportTopIncomeCategory as TeamCashCategory)} ${formatMoney(
                    reportTopIncomeAmount
                  )}`
                : "-"
            }
            topExpenseText={
              reportTopExpenseCategory
                ? `${teamCashCategoryLabel("expense", reportTopExpenseCategory as TeamCashCategory)} ${formatMoney(
                    reportTopExpenseAmount
                  )}`
                : "-"
            }
            compareText={reportCompareText}
            contributionRows={contributionRows.slice(0, 5)}
            increaseRows={expenseCategoryTrends.increases}
            decreaseRows={expenseCategoryTrends.decreases}
          />
        </div>
      </div>
    </div>
  );
}
