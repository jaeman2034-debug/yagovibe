import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import TeamPaywallModal from "@/features/billing/components/TeamPaywallModal";
import { useTeamBillingDoc } from "@/features/billing/hooks/useTeamBillingDoc";
import { canUseBulkFeeReminders } from "@/lib/billing/hubTeamPlanGates";
import { cancelStripeSubscriptionForTeam } from "@/lib/billing/cancelStripeSubscriptionForTeam";
import { updateSubscriptionForTeam } from "@/lib/billing/updateSubscriptionForTeam";
import { createStripeCheckoutForTeam } from "@/lib/billing/createStripeCheckoutForTeam";
import { backfillTeamFeeCashBookEntries } from "@/lib/team/backfillTeamFeeCashBookEntries";
import { repairTeamMembershipCashBookFeeIds } from "@/lib/team/repairTeamMembershipCashBookFeeIds";
import { repairTeamFeePayments } from "@/lib/team/repairTeamFeePayments";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { teamFeeSeoulCalendarYear } from "@/lib/fees/seoulFeeMonthKey";
import { useFeeCashBookReconciliation } from "../hooks/useFeeCashBookReconciliation";
import { useFeeReminderConversionKpi } from "../hooks/useFeeReminderConversionKpi";
import { useTeamFees } from "../hooks/useTeamFees";
import { useFeePayments } from "../hooks/useFeePayments";
import { useFeeRefundsForFee } from "../hooks/useFeeRefundsForFee";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import TeamFeeSummaryCard from "./TeamFeeSummaryCard";
import FeeReminderConversionKpiPanel from "./FeeReminderConversionKpiPanel";
import TeamFeeActionAlert from "./TeamFeeActionAlert";
import FeeReminderActionBar from "./FeeReminderActionBar";
import TeamFeeMonthTimeline from "./TeamFeeMonthTimeline";
import TeamFeePeriodPicker from "./TeamFeePeriodPicker";
import FeeMemberPaymentList from "./FeeMemberPaymentList";
import { StatCard } from "@/components/ui/StatCard";
import { useTeamFeePolicy } from "@/features/fees/hooks/useTeamFeePolicy";
import { isAnnualPrepaidPaymentSource } from "@/lib/fees/annualPrepaidSource";
import {
  aggregateFeeMoneyFromRows,
  buildFeeMemberRows,
  calculateFeeDashboardStats,
  filterMembersForFeeKpi,
  yearlyMemberKpi,
} from "../utils/feeDashboard";
import {
  analyzeFeeMonthKeysDebug,
  anchorYmFromFeeId,
  buildFeesForPeriodPicker,
  ensureSelectedFeeInChipList,
  feePickerMonthKeyOrId,
  filterPickerFeesByScope,
  resolveEffectiveSelectedFeeId,
  seoulYmNow,
} from "../utils/feeMonthUi";
import {
  sendBulkFeeReminderNotifications,
  sendCheckoutPendingFeeReminderNotifications,
} from "../utils/bulkFeeReminderNotifications";
import type { HubTeamPlanId } from "@/types/teamBilling";
import type { MemberDuesType } from "@/types/memberDues";
import { getFirebaseAuthBlockedHint } from "@/lib/firebase/firebaseAuthErrorHints";
import { memberBillingLookupKeys } from "@/lib/team/memberBillingUid";

type Props = {
  teamId: string;
  /** 팀 관리(총무) 화면에서만 true — 수동 납부 기록 버튼 */
  canRecordManualPayments?: boolean;
};

/** HTTPS Callable 오류 — 서버가 넘긴 본문 메시지까지 토스트에 노출 */
function formatHttpsCallableError(e: unknown): string {
  if (e !== null && typeof e === "object" && "message" in e) {
    const msg = String((e as { message?: unknown }).message);
    const code =
      "code" in e ? String((e as { code?: unknown }).code ?? "") : "";
    const blockedHint = getFirebaseAuthBlockedHint(`${code} ${msg}`);
    if (blockedHint) return blockedHint;
    if (code.includes("unauthenticated") || /로그인이 필요/.test(msg)) {
      return "로그인이 만료되었거나 세션이 없습니다. 다시 로그인하거나 페이지를 새로고침한 뒤 시도해 주세요.";
    }
    if (code && msg) return `${code}: ${msg}`;
    return msg || code || "요청에 실패했습니다.";
  }
  if (e instanceof Error) {
    const blockedHint = getFirebaseAuthBlockedHint(e.message);
    if (blockedHint) return blockedHint;
    return e.message;
  }
  return "요청에 실패했습니다.";
}

function formatDue(d: { toDate?: () => Date } | Date | null | undefined): string | null {
  if (!d) return null;
  const date =
    typeof (d as { toDate?: () => Date }).toDate === "function"
      ? (d as { toDate: () => Date }).toDate()
      : (d as Date);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

const PLAN_ORDER: HubTeamPlanId[] = ["free", "basic", "pro", "team_plus"];
const PLAN_TO_PRICE: Partial<Record<HubTeamPlanId, string>> = {
  basic: String(import.meta.env.VITE_STRIPE_PRICE_BASIC || "").trim(),
  pro: String(import.meta.env.VITE_STRIPE_PRICE_PRO || "").trim(),
  team_plus: String(import.meta.env.VITE_STRIPE_PRICE_TEAM_PLUS || "").trim(),
};
const PLAN_FALLBACK_MONTHLY_KRW: Record<HubTeamPlanId, number> = {
  free: 0,
  basic: 10000,
  pro: 100000,
  team_plus: 300000,
};

export default function FeeDashboard({ teamId, canRecordManualPayments = false }: Props) {
  const { user } = useAuth();
  const { billing: teamBilling, loading: billingLoading } = useTeamBillingDoc(teamId);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState<null | "cancel" | "resume">(null);
  const [planChangeBusy, setPlanChangeBusy] = useState<HubTeamPlanId | null>(null);
  const { fees, loading: feesLoading, error: feesError } = useTeamFees(teamId);
  const { members, loading: membersLoading, error: membersError } = useTeamMembers(teamId);
  const { policy: teamFeePolicy } = useTeamFeePolicy(teamId);
  const [selectedFeeId, setSelectedFeeId] = useState<string | undefined>();
  const [duesFilter, setDuesFilter] = useState<"all" | MemberDuesType>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [feeRemindBusy, setFeeRemindBusy] = useState<null | "outstanding" | "checkout_pending">(null);
  const [cashBookBackfillBusy, setCashBookBackfillBusy] = useState(false);
  const [cashBookFeeIdRepairBusy, setCashBookFeeIdRepairBusy] = useState(false);
  const [paymentRepairBusy, setPaymentRepairBusy] = useState(false);
  const [paymentRefreshToken, setPaymentRefreshToken] = useState(0);
  const [cashBookBackfillScope, setCashBookBackfillScope] = useState<"selected" | "all">("selected");
  const cashBookAccountingBusy = cashBookBackfillBusy || cashBookFeeIdRepairBusy || paymentRepairBusy;

  useEffect(() => {
    setDuesFilter("all");
    setPaymentFilter("all");
  }, [selectedFeeId]);

  const effectiveSelectedFeeId = useMemo(
    () => resolveEffectiveSelectedFeeId(fees, selectedFeeId),
    [fees, selectedFeeId]
  );

  /**
   * `selectedFeeId`가 비어 있으면 매 Firestore 스냅샷마다 동일 월 내 “대표 회차”가 바뀔 수 있음 →
   * 조회 feeId가 바뀌며 멤버별 완납/미납이 번갈아 보임. 최초·복구 시 한 번 고정한다.
   */
  useEffect(() => {
    if (fees.length === 0) return;
    if (selectedFeeId && fees.some((f) => f.id === selectedFeeId)) return;
    const next = resolveEffectiveSelectedFeeId(fees, selectedFeeId);
    if (next && next !== selectedFeeId) setSelectedFeeId(next);
  }, [fees, selectedFeeId]);

  const selectedFee = useMemo(() => {
    if (!effectiveSelectedFeeId) return null;
    return fees.find((fee) => fee.id === effectiveSelectedFeeId) ?? null;
  }, [fees, effectiveSelectedFeeId]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const mkDbg = analyzeFeeMonthKeysDebug(fees);
    const built = buildFeesForPeriodPicker(fees, selectedFeeId);
    const anchorYm = anchorYmFromFeeId(fees, effectiveSelectedFeeId);
    const scopedDefault = filterPickerFeesByScope(built.displayFees, built.monthKeysOrdered, {
      expand: false,
      anchorYm,
      nowYm: seoulYmNow(),
    });
    const ensuredDefault = ensureSelectedFeeInChipList(
      scopedDefault.visibleFees,
      effectiveSelectedFeeId,
      fees,
      built.displayFees
    );
    const firstVisible = ensuredDefault[0];
    const lastVisible = ensuredDefault.at(-1);
    const feeMonthsRange =
      ensuredDefault.length > 0
        ? {
            selectedYm: anchorYm,
            visibleRange: [
              firstVisible ? feePickerMonthKeyOrId(firstVisible) : null,
              lastVisible ? feePickerMonthKeyOrId(lastVisible) : null,
            ],
          }
        : { selectedYm: anchorYm, visibleRange: [null, null] as const };
    console.debug("[FeeDashboard] fee period UI", {
      ...mkDbg,
      visibleChipCountAfterDedupe: built.displayFees.length,
      visibleChipCountDefaultScope: scopedDefault.visibleFees.length,
      visibleChipCountAfterEnsureSelected: ensuredDefault.length,
      groupedMonthKeys: built.monthKeysOrdered,
      droppedDuplicateFeeIds: built.droppedFeeIds,
      effectiveSelectedFeeId,
      uiSelectionState: selectedFeeId,
      anchorYmForScope: anchorYm,
    });
    console.debug("[FeeMonths Range]", feeMonthsRange);
  }, [fees, selectedFeeId, effectiveSelectedFeeId]);

  const { payments, loading: paymentsLoading, error: paymentsError } = useFeePayments(
    teamId,
    effectiveSelectedFeeId,
    paymentRefreshToken
  );
  const {
    reconciliation,
    loading: reconciliationLoading,
    error: reconciliationError,
  } = useFeeCashBookReconciliation(teamId, effectiveSelectedFeeId);

  const feeKpiRoster = useMemo(() => filterMembersForFeeKpi(members), [members]);

  const allowedBillingMemberIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of feeKpiRoster) {
      for (const k of memberBillingLookupKeys(m)) s.add(k);
    }
    return s;
  }, [feeKpiRoster]);

  const { refunds: feeRefunds, loading: feeRefundsLoading, error: feeRefundsError } = useFeeRefundsForFee(
    teamId,
    effectiveSelectedFeeId
  );

  const refundAllocatedByMemberId = useMemo(() => {
    const fid = selectedFee?.id;
    if (!fid) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const r of feeRefunds) {
      if (String(r.status || "").trim() !== "completed") continue;
      const mid = String(r.memberId ?? "").trim();
      if (!mid) continue;
      const slice = r.allocationDetail?.perFeeWon?.[fid];
      const w = typeof slice === "number" && Number.isFinite(slice) ? Math.floor(slice) : 0;
      if (w > 0) map[mid] = (map[mid] ?? 0) + w;
    }
    return map;
  }, [feeRefunds, selectedFee?.id]);

  const {
    kpi: feeReminderConversionKpi,
    reminderRowCount,
    dataSource: feeReminderKpiSource,
    loading: feeReminderKpiLoading,
    error: feeReminderKpiError,
  } = useFeeReminderConversionKpi(teamId, effectiveSelectedFeeId, payments, paymentsLoading, feeKpiRoster);

  const rows = useMemo(() => {
    if (!selectedFee) return [];
    return buildFeeMemberRows(members, payments, selectedFee.amount, selectedFee.dueDate, selectedFee.id);
  }, [members, payments, selectedFee]);

  const filteredRows = useMemo(() => {
    if (duesFilter === "all") return rows;
    return rows.filter((r) => r.duesType === duesFilter);
  }, [rows, duesFilter]);

  const displayRows = useMemo(() => {
    if (paymentFilter === "all") return filteredRows;
    if (paymentFilter === "paid") return filteredRows.filter((r) => r.paymentStatus === "paid");
    return filteredRows.filter((r) => r.paymentStatus !== "paid");
  }, [filteredRows, paymentFilter]);

  /** 상단 KPI — `filteredRows`만 사용(payments.length 금지). 회비 유형 필터와 동일 코호트 */
  const feeHeadlineKpi = useMemo(() => {
    const feeMemberRows = filteredRows;
    const totalMembers = feeMemberRows.length;
    /** 면제(`duesType === "exempt"`)는 `buildFeeMemberRows`에서 이미 `paymentStatus: "paid"`로 집계됨 */
    const paidMembers = feeMemberRows.filter((r) => r.paymentStatus === "paid").length;
    const paymentRate =
      totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;
    return { totalMembers, paidMembers, paymentRate };
  }, [filteredRows]);

  /** 예상·실적·연납 비율 — `filteredRows`만 사용(payments.reduce 금지). 실제 수입은 회차별 환불(`allocationDetail.perFeeWon`) 차감 */
  const feeExtendedKpi = useMemo(() => {
    const feeMemberRows = filteredRows;
    const totalMembers = feeMemberRows.length;
    const policyAmt = Math.max(0, Math.floor(teamFeePolicy.monthlyAmount));
    const feeAmt = selectedFee ? Math.max(0, Math.floor(selectedFee.amount)) : 0;
    const unitForExpected = policyAmt > 0 ? policyAmt : feeAmt;
    /** 청구 총액·실입금(부분납 포함) — `row.amount` 잔액 합이 아님 (`feeRowBillableDueWon` 기준) */
    const rowMoney = aggregateFeeMoneyFromRows(feeMemberRows);
    const expectedRevenue = rowMoney.totalBillableWon;
    const fid = selectedFee?.id;
    let refundDeductionWon = 0;
    if (fid) {
      for (const r of feeRefunds) {
        if (String(r.status || "").trim() !== "completed") continue;
        const w = r.allocationDetail?.perFeeWon?.[fid];
        const slice = typeof w === "number" && Number.isFinite(w) ? Math.floor(w) : 0;
        if (slice > 0) refundDeductionWon += slice;
      }
    }
    const grossPaidRevenue = rowMoney.collectedPaidWon;
    const actualRevenue = Math.max(0, grossPaidRevenue - refundDeductionWon);
    const amountCollectionRate =
      expectedRevenue > 0 ? Math.round((grossPaidRevenue / expectedRevenue) * 100) : 0;
    const annualMembers = feeMemberRows.filter((r) => isAnnualPrepaidPaymentSource(r.sourceType)).length;
    const annualRate =
      totalMembers > 0 ? Math.round((annualMembers / totalMembers) * 100) : 0;
    return {
      expectedRevenue,
      actualRevenue,
      grossPaidRevenue,
      refundDeductionWon,
      amountCollectionRate,
      annualRate,
      annualMembers,
      unitForExpected,
      expectedBasis: policyAmt > 0 ? ("policy" as const) : ("fee" as const),
      billableMemberCount: feeMemberRows.filter((r) => r.duesType !== "exempt").length,
    };
  }, [filteredRows, teamFeePolicy.monthlyAmount, selectedFee, feeRefunds]);

  const overdueRows = useMemo(() => rows.filter((r) => r.paymentStatus === "overdue"), [rows]);

  const stats = useMemo(() => {
    const base = calculateFeeDashboardStats(rows, rows.length);
    const rowMoney = aggregateFeeMoneyFromRows(rows);
    const paymentsSoTCollected = rowMoney.collectedPaidWon;
    const outstandingAmountWon = rowMoney.outstandingWon;
    const { yearlyMemberCount, yearlyMemberRate } = yearlyMemberKpi(feeKpiRoster);
    const cashbookCollected = reconciliation.actualCashBookIncomeWon;
    const allFeesCashBook = reconciliation.allFeesMembershipCashBookIncomeWon;
    const paidWithoutCashMemberCount = rows.filter(
      (r) =>
        r.paymentStatus === "paid" &&
        r.amount === 0 &&
        (r.duesType === "yearly" || r.duesType === "exempt")
    ).length;
    return {
      ...base,
      /** 회계(cashBook) — 백필·실입금 */
      collectedAmountWon: cashbookCollected,
      allFeesMembershipCashBookIncomeWon: allFeesCashBook,
      paymentsSoTCollectedWon: paymentsSoTCollected,
      paidWithoutCashMemberCount,
      outstandingAmountWon,
      yearlyMemberCount,
      yearlyMemberRate,
    };
  }, [rows, reconciliation.actualCashBookIncomeWon, reconciliation.allFeesMembershipCashBookIncomeWon]);
  const loading =
    feesLoading || membersLoading || paymentsLoading || (!!selectedFee && feeRefundsLoading);
  const error = feesError || membersError || paymentsError;

  /** payments 에 paid 가 있는데, 팀 cashBook 회비 수입이 전혀 없음 → 백필 권장 */
  const needsAccountingBackfillFirst = useMemo(() => {
    if (!selectedFee || reconciliationLoading) return false;
    return (
      reconciliation.expectedPaidAmountWon > 0 &&
      reconciliation.actualCashBookIncomeWon === 0 &&
      reconciliation.allFeesMembershipCashBookIncomeWon === 0
    );
  }, [
    selectedFee,
    reconciliationLoading,
    reconciliation.actualCashBookIncomeWon,
    reconciliation.expectedPaidAmountWon,
    reconciliation.allFeesMembershipCashBookIncomeWon,
  ]);

  /** 이 회차엔 cashBook 반영이 없지만 다른 회차 등에는 수입이 있음 → 회차/feeId 안내 */
  const cashBookLikelyOtherFeeScope = useMemo(() => {
    if (!selectedFee || reconciliationLoading) return false;
    return (
      reconciliation.expectedPaidAmountWon > 0 &&
      reconciliation.actualCashBookIncomeWon === 0 &&
      reconciliation.allFeesMembershipCashBookIncomeWon > 0
    );
  }, [
    selectedFee,
    reconciliationLoading,
    reconciliation.actualCashBookIncomeWon,
    reconciliation.expectedPaidAmountWon,
    reconciliation.allFeesMembershipCashBookIncomeWon,
  ]);

  const dueLabel = selectedFee ? formatDue(selectedFee.dueDate) : null;

  const feeDueYear = useMemo(() => {
    if (!selectedFee?.dueDate) return undefined;
    const parsed = firestoreLikeToDate(selectedFee.dueDate);
    return parsed ? teamFeeSeoulCalendarYear(parsed) : undefined;
  }, [selectedFee?.dueDate]);

  const actionableCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.isBillingActionable !== false &&
          (r.paymentStatus === "unpaid" || r.paymentStatus === "failed" || r.paymentStatus === "overdue")
      ).length,
    [rows]
  );

  const checkoutPendingReminderEligible = useMemo(
    () =>
      rows.filter((r) => r.isBillingActionable !== false && r.paymentStatus === "pending").length,
    [rows]
  );

  const actionHeadline = useMemo(() => {
    if (rows.length === 0) return null;
    if (overdueRows.length > 0) {
      return `연체 ${overdueRows.length}명 — 마감일이 지났는데 아직 납부가 없어요.`;
    }
    if (stats.unpaidCount + stats.failedCount > 0) {
      const n = stats.unpaidCount + stats.failedCount;
      return `${n}명이 아직 회비를 안 냈어요.`;
    }
    if (stats.pendingCount > 0) {
      return `결제 진행 중인 멤버가 ${stats.pendingCount}명 있어요. 잠시 후 다시 확인해 주세요.`;
    }
    return "이번 회비는 모두 정상 납부됐어요.";
  }, [rows.length, overdueRows.length, stats.unpaidCount, stats.failedCount, stats.pendingCount]);

  const actionSubline = useMemo(() => {
    if (actionableCount <= 0) return null;
    return `미납·실패·연체 ${actionableCount}명에게 한 번에 알림을 보낼 수 있어요.`;
  }, [actionableCount]);

  const canCheckoutAsOwner = Boolean(
    user?.uid && teamBilling?.ownerUid && user.uid === teamBilling.ownerUid
  );
  const isPaidPlan =
    teamBilling?.plan === "basic" || teamBilling?.plan === "pro" || teamBilling?.plan === "team_plus";
  const canManageSubscription = canCheckoutAsOwner && isPaidPlan;
  const canChangePlan = canCheckoutAsOwner && teamBilling?.billingStatus !== "past_due";
  const canResumeScheduledCancel =
    teamBilling?.billingStatus === "active" && teamBilling?.cancelAtPeriodEnd === true;
  const nextBillingReadableLabel = teamBilling?.currentPeriodEnd
    ? teamBilling.currentPeriodEnd.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
      })
    : "-";
  const dDayLabel = useMemo(() => {
    if (!teamBilling?.currentPeriodEnd) return null;
    const now = new Date();
    const diff = teamBilling.currentPeriodEnd.getTime() - now.getTime();
    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (d < 0) return "지남";
    return `${d}일 후`;
  }, [teamBilling?.currentPeriodEnd]);
  const displayAmount = useMemo(() => {
    if (!teamBilling) return 0;
    if (typeof teamBilling.billingUnitAmount === "number" && teamBilling.billingUnitAmount >= 0) {
      return teamBilling.billingUnitAmount;
    }
    return PLAN_FALLBACK_MONTHLY_KRW[teamBilling.plan] ?? 0;
  }, [teamBilling]);
  const displayAmountLabel = `월 ₩${displayAmount.toLocaleString("ko-KR")}`;

  const assertCanSendFeeReminders = () => {
    if (!billingLoading && teamBilling && !canUseBulkFeeReminders(teamBilling.plan, teamBilling.billingStatus)) {
      setPaywallOpen(true);
      return false;
    }
    return true;
  };

  const handleBulkRemind = async () => {
    if (!selectedFee) return;
    if (!assertCanSendFeeReminders()) return;
    const n = await sendBulkFeeReminderNotifications(teamId, selectedFee.id, rows);
    if (n === 0) toast.message("발송할 미납·연체 멤버가 없습니다.");
    else toast.success(`독촉 알림 ${n}건을 보냈어요.`);
  };

  const handleOutstandingFeeRemind = async () => {
    if (!selectedFee) return;
    if (!assertCanSendFeeReminders()) return;
    setFeeRemindBusy("outstanding");
    try {
      const n = await sendBulkFeeReminderNotifications(teamId, selectedFee.id, rows);
      if (n === 0) toast.message("발송할 대상이 없습니다. (미결제·실패·연체)");
      else toast.success(`미확인 미납 알림 ${n}건을 보냈어요.`);
    } catch (e) {
      console.error(e);
      toast.error("알림 발송에 실패했습니다.");
    } finally {
      setFeeRemindBusy(null);
    }
  };

  const handleCheckoutPendingFeeRemind = async () => {
    if (!selectedFee) return;
    if (!assertCanSendFeeReminders()) return;
    setFeeRemindBusy("checkout_pending");
    try {
      const n = await sendCheckoutPendingFeeReminderNotifications(teamId, selectedFee.id, rows);
      if (n === 0) toast.message("결제 진행 중인 멤버가 없습니다.");
      else toast.success(`결제 진행 중 안내 알림 ${n}건을 보냈어요.`);
    } catch (e) {
      console.error(e);
      toast.error("알림 발송에 실패했습니다.");
    } finally {
      setFeeRemindBusy(null);
    }
  };

  const handleCashBookBackfill = async () => {
    if (!canRecordManualPayments || cashBookAccountingBusy) return;
    if (!user?.uid) {
      toast.error("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
      return;
    }
    const ok = window.confirm(
      "이미 paid 인 회비 납부건을 회계(cashBook)로 1회 동기화합니다. 진행할까요?"
    );
    if (!ok) return;
    setCashBookBackfillBusy(true);
    try {
      const result = await backfillTeamFeeCashBookEntries({
        teamId,
        feeId: cashBookBackfillScope === "selected" ? selectedFee?.id : undefined,
      });
      const patched = result.patched ?? 0;
      const re = result.rowErrors ?? 0;
      const scopeHint =
        cashBookBackfillScope === "selected" && result.fetched != null
          ? ` · 같은 회차 payments ${result.fetched}건(paid ${result.scanned}건 백필 대상)`
          : "";
      if (re > 0) {
        toast.message(
          `백필 중 ${re}건은 건별 오류로 건너뜀(Functions 로그에 paymentDocId 있음). 나머지는 반영됨.`
        );
      }
      toast.success(
        `회계 백필 완료(${cashBookBackfillScope === "selected" ? "현재 회차" : "전체 회차"})${scopeHint} · 신규 ${result.created}건 / feeId보정 ${patched}건 / 중복스킵 ${result.skipped}건`
      );

      // 현재 회차에서 paid 백필 대상이 0건일 때 전체 회차 재시도 유도
      if (cashBookBackfillScope === "selected" && result.scanned === 0) {
        const retryAll = window.confirm(
          result.fetched != null && result.fetched > 0
            ? `이 회차 payments는 ${result.fetched}건 있지만 status가 paid인 건이 없습니다.\n전체 팀에서 paid 건만 백필할까요?`
            : "현재 회차에서 해당 feeId의 payments를 찾지 못했습니다.\n전체 팀 paid 건으로 백필할까요?"
        );
        if (retryAll) {
          const allResult = await backfillTeamFeeCashBookEntries({ teamId });
          const ap = allResult.patched ?? 0;
          const are = allResult.rowErrors ?? 0;
          if (are > 0) {
            toast.message(`백필 중 ${are}건은 건별 오류로 건너뜀 — Functions 로그 확인`);
          }
          toast.success(
            `전체 회차 백필 완료 · paid ${allResult.scanned}건 대상 · 신규 ${allResult.created}건 / feeId보정 ${ap}건 / 중복스킵 ${allResult.skipped}건`
          );
          setCashBookBackfillScope("all");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(formatHttpsCallableError(e));
    } finally {
      setCashBookBackfillBusy(false);
    }
  };

  const handleCashBookFeeIdRepair = async () => {
    if (!canRecordManualPayments || cashBookAccountingBusy) return;
    if (!user?.uid) {
      toast.error("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
      return;
    }
    const ok = window.confirm(
      "이미 존재하는 cashBook(회비 수입) 문서의 feeId만 채웁니다. cashBook이 비어 있으면 할 일이 없으며, 그때는 「회계 백필 실행」으로 먼저 수입을 만들어야 합니다. 진행할까요?"
    );
    if (!ok) return;
    setCashBookFeeIdRepairBusy(true);
    try {
      const result = await repairTeamMembershipCashBookFeeIds({ teamId });
      toast.success(`회계 feeId 복구 완료 · 검토 ${result.scanned}건 / 보정 ${result.patched}건`);
      if (result.scanned === 0) {
        toast.message(
          "teams/…/cashBook 에 문서가 없습니다. 수납액은 cashBook 합계라 0원으로 보일 수 있어요. 먼저 「회계 백필 실행」(현재 또는 전체 회차)을 실행하세요."
        );
      } else if (result.patched === 0) {
        toast.message(
          "cashBook은 있으나 feeId를 고칠 행이 없습니다.(이미 일치하거나 sourceRefId가 feePayment:… 형식이 아님)"
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(formatHttpsCallableError(e));
    } finally {
      setCashBookFeeIdRepairBusy(false);
    }
  };

  const handlePaymentDataRepair = async () => {
    if (!canRecordManualPayments || cashBookAccountingBusy) return;
    if (!user?.uid) {
      toast.error("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
      return;
    }
    const ok = window.confirm(
      "선택한 회차의 결제 데이터(payment)에서 금액/식별자 누락을 자동 보정합니다. 진행할까요?"
    );
    if (!ok) return;
    setPaymentRepairBusy(true);
    try {
      const dryRun = await repairTeamFeePayments({
        teamId,
        feeId: selectedFee?.id,
        dryRun: true,
      });
      const run = await repairTeamFeePayments({
        teamId,
        feeId: selectedFee?.id,
        dryRun: false,
      });
      toast.success(
        `결제 데이터 복구 완료 · 검토 ${dryRun.scanned}건 / 금액 보정 ${run.repairedAmount}건 / 식별자 보정 ${run.repairedIdentity}건`
      );
      setPaymentRefreshToken((v) => v + 1);
    } catch (e) {
      console.error(e);
      toast.error(formatHttpsCallableError(e));
    } finally {
      setPaymentRepairBusy(false);
    }
  };

  const handleSubscriptionChange = async (action: "cancel" | "resume") => {
    if (!canManageSubscription) return;
    if (action === "cancel" && teamBilling?.cancelAtPeriodEnd) {
      toast.message("이미 해지 예약 상태입니다.");
      return;
    }
    setSubscriptionBusy(action);
    try {
      await cancelStripeSubscriptionForTeam({ teamId, action });
      if (action === "cancel") {
        toast.success("해지가 예약되었습니다. 다음 결제일까지 계속 이용할 수 있습니다.");
      } else {
        toast.success("해지 예약이 취소되었습니다.");
      }
    } catch (e) {
      console.error(e);
      toast.error(action === "cancel" ? "구독 해지 예약에 실패했습니다." : "해지 예약 취소에 실패했습니다.");
    } finally {
      setSubscriptionBusy(null);
    }
  };

  const handlePlanChange = async (targetPlan: HubTeamPlanId) => {
    if (!canChangePlan || !teamBilling) return;
    if (teamBilling.plan === targetPlan && targetPlan !== "free") {
      toast.message("이미 선택된 플랜입니다.");
      return;
    }
    const currentPlanIdx = PLAN_ORDER.indexOf(teamBilling.plan);
    const targetPlanIdx = PLAN_ORDER.indexOf(targetPlan);
    const isDowngrade = targetPlanIdx < currentPlanIdx;

    if (targetPlan === "free") {
      const ok = window.confirm(
        "현재 구독은 다음 결제일까지 유지되며, 이후 자동으로 종료됩니다.\n무료 전환(해지 예약)을 진행할까요?"
      );
      if (!ok) return;
    } else if (isDowngrade) {
      const ok = window.confirm(
        `다음 결제일부터 ${targetPlan.toUpperCase()} 플랜으로 변경됩니다. 계속하시겠습니까?`
      );
      if (!ok) return;
    }

    setPlanChangeBusy(targetPlan);
    try {
      const mappedPrice = PLAN_TO_PRICE[targetPlan];
      const res = await updateSubscriptionForTeam({ teamId, plan: targetPlan });
      if (targetPlan !== "free" && !mappedPrice) {
        console.warn("[FeeDashboard] plan->price 매핑 없음", { targetPlan });
      }
      if (res.mode === "cancel_at_period_end") {
        toast.success("무료 전환이 예약되었습니다. 다음 결제일까지는 현재 플랜을 사용할 수 있습니다.");
      } else if (res.mode === "price_update") {
        if (targetPlan === "basic" || targetPlan === "pro" || targetPlan === "team_plus") {
          const msg =
            teamBilling.plan === "free" || targetPlan === "team_plus" || targetPlan === "pro"
              ? "플랜 변경이 적용되었습니다."
              : "다운그레이드는 다음 결제일부터 반영될 수 있습니다.";
          toast.success(msg);
        }
      } else {
        toast.message("이미 적용된 플랜입니다.");
      }
    } catch (e) {
      console.error(e);
      toast.error("플랜 변경에 실패했습니다.");
    } finally {
      setPlanChangeBusy(null);
    }
  };

  const handleResubscribe = async () => {
    if (!canCheckoutAsOwner) return;
    setPlanChangeBusy("pro");
    try {
      const url = await createStripeCheckoutForTeam({ teamId, tier: "pro" });
      window.location.assign(url);
    } catch (e) {
      console.error(e);
      toast.error("다시 구독하기를 시작하지 못했습니다.");
    } finally {
      setPlanChangeBusy(null);
    }
  };

  if (error) {
    return <div className="rounded-2xl border bg-white p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 sm:max-w-none">
      {canCheckoutAsOwner && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900">구독 관리</h4>
          {teamBilling?.billingStatus === "past_due" ? (
            <p className="mt-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900">
              ⚠️ 결제가 실패했습니다. 결제 수단을 업데이트해 주세요.
            </p>
          ) : teamBilling?.cancelAtPeriodEnd ? (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              ⚠️ 해지 예약됨: 다음 결제일까지 이용 후 자동 종료됩니다.
            </p>
          ) : teamBilling?.billingStatus === "canceled" ? (
            <p className="mt-2 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800">
              구독이 종료되었습니다. 다시 구독하면 유료 기능이 즉시 복구됩니다.
            </p>
          ) : (
            <p className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900">
              ✅ 현재 {String(teamBilling?.plan || "").toUpperCase()} 플랜 이용 중입니다. 다음 결제일까지 모든 기능을 사용할 수 있습니다.
            </p>
          )}
          <div className="mt-2 grid gap-1 text-xs text-gray-600">
            <p>
              현재 플랜: <span className="font-semibold text-gray-900">{teamBilling?.plan ?? "-"}</span>
            </p>
            <p>
              플랜 가격: <span className="font-semibold text-gray-900">{displayAmountLabel}</span>
            </p>
            <p>
              다음 결제일:{" "}
              <span className="font-semibold text-gray-900">
                {nextBillingReadableLabel}
                {dDayLabel ? ` (${dDayLabel})` : ""}
              </span>
            </p>
            <p>
              상태: <span className="font-semibold text-gray-900">{teamBilling?.billingStatus ?? "-"}</span>
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {teamBilling?.cancelAtPeriodEnd
              ? "해지 예약됨: 다음 결제일까지 계속 이용 가능하며 이후 자동 해지됩니다."
              : "구독 해지 시 즉시 종료되지 않고 다음 결제일에 자동 해지됩니다."}
          </p>
          {teamBilling?.cancelAtPeriodEnd && (
            <p className="mt-2 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800">
              현재 구독은 다음 결제일까지 유지되며, 이후 자동으로 종료됩니다.
            </p>
          )}
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700">플랜 변경</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["basic", "pro", "team_plus", "free"] as HubTeamPlanId[]).map((targetPlan) => {
                const isCurrentPaid = teamBilling?.plan === targetPlan && targetPlan !== "free";
                const isCanceled = teamBilling?.billingStatus === "canceled";
                const disabled =
                  billingLoading ||
                  subscriptionBusy !== null ||
                  planChangeBusy !== null ||
                  !canChangePlan ||
                  isCurrentPaid ||
                  isCanceled;
                const label =
                  targetPlan === "free"
                    ? "구독 해지 예약"
                    : targetPlan === "team_plus"
                      ? "Team+로 업그레이드 🔥 인기"
                      : targetPlan === "pro"
                        ? "Pro로 업그레이드 ⭐ 추천"
                        : "Basic으로 변경 (다음 결제일부터)";
                return (
                  <button
                    key={targetPlan}
                    type="button"
                    disabled={disabled}
                    onClick={() => void handlePlanChange(targetPlan)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {planChangeBusy === targetPlan ? "처리 중…" : label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-rose-600">
              구독 해지 예약: 다음 결제일까지 이용 후 Free로 전환됩니다.
            </p>
            <p className="mt-2 text-[11px] text-gray-500">
              업그레이드는 즉시 반영되며, 다운그레이드/무료 전환은 다음 결제 주기에 반영될 수 있습니다.
            </p>
            {teamBilling?.billingStatus === "canceled" && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={planChangeBusy !== null || subscriptionBusy !== null}
                  onClick={() => void handleResubscribe()}
                  className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {planChangeBusy === "pro" ? "변경 중..." : "다시 구독하기"}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!canResumeScheduledCancel ? (
              <button
                type="button"
                disabled={
                  subscriptionBusy !== null ||
                  planChangeBusy !== null ||
                  teamBilling?.billingStatus === "past_due" ||
                  teamBilling?.billingStatus === "canceled"
                }
                onClick={() => void handleSubscriptionChange("cancel")}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50"
              >
                {subscriptionBusy === "cancel" ? "변경 중..." : "구독 해지 예약"}
              </button>
            ) : (
              <button
                type="button"
                disabled={subscriptionBusy !== null || planChangeBusy !== null}
                onClick={() => void handleSubscriptionChange("resume")}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
              >
                {subscriptionBusy === "resume" ? "변경 중..." : "해지 예약 취소"}
              </button>
            )}
          </div>
        </div>
      )}
      <TeamPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        teamId={teamId}
        feature="bulk_reminder"
        canStartCheckout={canCheckoutAsOwner}
      />
      {fees.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          등록된 회비가 없습니다. 아래에서 새 회비를 만들면 이곳에 요약이 표시됩니다.
        </div>
      )}

      {selectedFee && !loading && (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">현재 보기·필터 기준</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="총 인원" value={feeHeadlineKpi.totalMembers} variant="primary" />
                <StatCard label="완납" value={feeHeadlineKpi.paidMembers} variant="success" />
                <StatCard label="납부율" value={`${feeHeadlineKpi.paymentRate}%`} variant="default" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">수입·연납 (행 합계)</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="예상 수입"
                  value={`${feeExtendedKpi.expectedRevenue.toLocaleString("ko-KR")}원`}
                  subtitle={`비면제 ${feeExtendedKpi.billableMemberCount}명 청구액 합 · 참고 월액 ${feeExtendedKpi.unitForExpected.toLocaleString("ko-KR")}원`}
                  variant="primary"
                />
                <StatCard
                  label="실제 수입"
                  value={`${feeExtendedKpi.actualRevenue.toLocaleString("ko-KR")}원`}
                  subtitle={
                    feeExtendedKpi.refundDeductionWon > 0
                      ? `유입 ${feeExtendedKpi.grossPaidRevenue.toLocaleString("ko-KR")}원 − 환불 ${feeExtendedKpi.refundDeductionWon.toLocaleString("ko-KR")}원 · 금액 징수율 ${feeExtendedKpi.amountCollectionRate}%`
                      : `행 기준 유입 ${feeExtendedKpi.grossPaidRevenue.toLocaleString("ko-KR")}원 · 금액 징수율 ${feeExtendedKpi.amountCollectionRate}%`
                  }
                  variant="success"
                />
                <StatCard
                  label="연납 비율"
                  value={`${feeExtendedKpi.annualRate}%`}
                  subtitle={`연납 분해 행 ${feeExtendedKpi.annualMembers}명 / 표시 인원`}
                  variant="default"
                />
              </div>
              {feeRefundsError ? (
                <p className="text-xs text-amber-800">{feeRefundsError}</p>
              ) : null}
            </div>
          </div>

          <TeamFeeSummaryCard
            stats={stats}
            feeTitle={selectedFee.title}
            feeAmount={selectedFee.amount}
            dueLabel={dueLabel}
            onOutstandingAmountClick={() => setPaymentFilter("unpaid")}
            reconciliationBadge={{
              loading: reconciliationLoading,
              isMatched: reconciliation.isMatched,
              deltaWon: reconciliation.deltaWon,
            }}
          />

          <FeeReminderConversionKpiPanel
            loading={feeReminderKpiLoading}
            error={feeReminderKpiError}
            reminderRowCount={reminderRowCount}
            dataSource={feeReminderKpiSource}
            kpi={feeReminderConversionKpi}
          />

          {canRecordManualPayments && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
              {needsAccountingBackfillFirst ? (
                <div className="mb-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950">
                  <strong>수납액이 0원인 이유:</strong> 이번 회차 payments 기준 납부 합계는 있는데, 아직{" "}
                  <code className="rounded bg-amber-100 px-0.5">cashBook</code>에 회비 수입 행이 없습니다.
                  먼저 아래 <strong>회계 백필 실행</strong>을 하세요. 「feeId 복구」는 cashBook에 행이 생긴 뒤,
                  <code className="rounded bg-amber-100 px-0.5">feeId</code>만 비었을 때 쓰는 보정입니다.
                </div>
              ) : cashBookLikelyOtherFeeScope ? (
                <div className="mb-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-[11px] leading-snug text-sky-950">
                  <strong>이 회차 KPI만 0원인 경우:</strong> 위 요약에{" "}
                  <strong>팀 전체 회비 수입(cashBook)</strong>이 보이면, 반영은 다른 회차에만 있거나{" "}
                  <code className="rounded bg-sky-100 px-0.5">feeId</code>가 이 회차와 맞지 않을 수 있습니다. 상단{" "}
                  <strong>회차</strong>를 바꿔 보거나 「feeId 복구」를 검토하세요.
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-slate-700">
                    순서: <strong>회계 백필</strong>(paid → cashBook 생성) → 필요 시 <strong>feeId 복구</strong>
                    (기존 행의 feeId만 채움). 수납액 KPI는 cashBook 기준입니다.
                  </p>
                  {reconciliationError ? (
                    <p className="text-[11px] text-rose-700">{reconciliationError}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={cashBookBackfillScope}
                    onChange={(e) =>
                      setCashBookBackfillScope(
                        e.target.value === "all" ? "all" : "selected"
                      )
                    }
                    disabled={cashBookAccountingBusy}
                    className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
                  >
                    <option value="selected">현재 회차</option>
                    <option value="all">전체 회차</option>
                  </select>
                  <button
                    type="button"
                    disabled={cashBookAccountingBusy}
                    onClick={() => void handleCashBookBackfill()}
                    className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {cashBookBackfillBusy ? "동기화 중..." : "회계 백필 실행"}
                  </button>
                  <button
                    type="button"
                    disabled={cashBookAccountingBusy}
                    onClick={() => void handlePaymentDataRepair()}
                    className="min-h-[38px] rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-950 hover:bg-indigo-100 disabled:opacity-50"
                    title="payments amount=0/식별자 누락 데이터를 복구한 뒤 목록을 다시 불러옵니다."
                  >
                    {paymentRepairBusy ? "복구 중..." : "결제 데이터 복구"}
                  </button>
                  <button
                    type="button"
                    disabled={cashBookAccountingBusy}
                    onClick={() => void handleCashBookFeeIdRepair()}
                    className="min-h-[38px] rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                    title="sourceRefId가 feePayment:… 형식인데 feeId가 비어 있는 cashBook 문서만 보정"
                  >
                    {cashBookFeeIdRepairBusy ? "복구 중..." : "feeId 복구"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <FeeReminderActionBar
            notPaidTotal={stats.notPaidCount}
            outstandingEligible={actionableCount}
            checkoutPendingEligible={checkoutPendingReminderEligible}
            busyKind={feeRemindBusy}
            onOutstandingRemind={() => void handleOutstandingFeeRemind()}
            onCheckoutPendingRemind={() => void handleCheckoutPendingFeeRemind()}
          />

          <TeamFeeActionAlert
            headline={actionHeadline}
            subline={actionSubline}
            actionableCount={actionableCount}
            showBulkRemindButton={false}
            onBulkRemind={() =>
              handleBulkRemind().catch(() => toast.error("알림 발송에 실패했습니다."))
            }
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">납부 상태</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all" as const, label: "전체" },
                  { id: "unpaid" as const, label: "미납" },
                  { id: "paid" as const, label: "완료" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setPaymentFilter(chip.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${
                    paymentFilter === chip.id
                      ? "bg-indigo-900 text-white ring-indigo-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">회비 유형</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all" as const, label: "전체" },
                  { id: "monthly" as const, label: "월납" },
                  { id: "yearly" as const, label: "연납" },
                  { id: "exempt" as const, label: "면제" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setDuesFilter(chip.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${
                    duesFilter === chip.id
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <FeeMemberPaymentList
            teamId={teamId}
            feeId={selectedFee.id}
            rows={displayRows}
            allowedBillingMemberIds={allowedBillingMemberIds}
            dueDateLabel={dueLabel}
            feeDueYear={feeDueYear}
            canRecordManualPayments={canRecordManualPayments}
            canMarkYearly={canRecordManualPayments}
            standardMonthlyFee={selectedFee.amount}
            refundAllocatedByMemberId={refundAllocatedByMemberId}
            onRefreshPayments={() => setPaymentRefreshToken((v) => v + 1)}
          />
        </>
      )}

      {fees.length > 0 && (
        <div className="space-y-4">
          <TeamFeeMonthTimeline
            fees={fees}
            selectedFeeId={effectiveSelectedFeeId}
            onSelect={setSelectedFeeId}
          />
          <TeamFeePeriodPicker fees={fees} selectedFeeId={effectiveSelectedFeeId} onSelect={setSelectedFeeId} />
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          회비 데이터를 불러오는 중입니다…
        </div>
      )}
    </div>
  );
}
