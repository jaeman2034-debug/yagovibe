import { useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { NOTIFICATION_EXPERIMENT_IDS, buildFeeReminderExperimentFields } from "@/lib/notifications/experiments/pushExperimentCopy";
import { resolveNotificationExperimentVariant } from "@/lib/notifications/experiments/resolveNotificationExperimentVariant";
import { buildFeePaymentCorrelationId } from "@/lib/fees/feePaymentCorrelationId";
import {
  getRecordManualTeamFeePaymentErrorMessage,
  recordManualTeamFeePayment,
} from "@/lib/team/recordManualTeamFeePayment";
import {
  getRegisterAnnualPrepaidPaymentErrorMessage,
  registerAnnualPrepaidPayment,
} from "@/lib/team/registerAnnualPrepaidPayment";
import {
  cancelAnnualPrepaidPayment,
  getCancelAnnualPrepaidPaymentErrorMessage,
} from "@/lib/team/cancelAnnualPrepaidPayment";
import {
  getRegisterFeeRefundErrorMessage,
  registerFeeRefund,
} from "@/lib/team/registerFeeRefund";
import {
  getPartialTeamFeePaymentErrorMessage,
  recordPartialTeamFeePayment,
  rollbackPartialTeamFeePayment,
} from "@/lib/team/partialTeamFeePaymentCallables";
import {
  maxSelectableAnnualDiscountMonths,
} from "@/lib/team/teamFeePolicy";
import { useTeamFeePolicy } from "@/features/fees/hooks/useTeamFeePolicy";
import { isAnnualPrepaidPaymentSource } from "@/lib/fees/annualPrepaidSource";
import type { FeeMemberRow } from "../types";
import { seoulCalendarFromInstant } from "../utils/seoulFeeDue";

export type TeamFeeMemberPaymentCardProps = {
  teamId: string;
  feeId: string;
  row: FeeMemberRow;
  /** 선택 회차 월 회비(원) — 연납 할인 계산 기준 */
  standardMonthlyFee?: number;
  dueDateLabel?: string | null;
  billingBusyUid: string | null;
  /** 팀 관리 탭에서만 true */
  canRecordManualPayment?: boolean;
  /** 총무: `duesType` 연납 + `yearlyPaidAt` */
  canMarkYearly?: boolean;
  /** 회비 마감 연도(없으면 올해) */
  feeDueYear?: number;
  /** 이번 회차에 배분된 환불 합 — KPI·남은 한도 계산 */
  refundAllocatedWon?: number;
  onReRegister: () => void;
  onRefreshPayments?: () => void;
};

type AnnualDiscountMode = "NONE" | "EARLY_BIRD" | "MANUAL";

function getStatusLabel(status: FeeMemberRow["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "완납";
    case "pending":
      return "진행중";
    case "failed":
      return "실패";
    case "overdue":
      return "연체";
    case "unpaid":
    default:
      return "미납";
  }
}

function getStatusClass(status: FeeMemberRow["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80";
    case "pending":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
    case "failed":
      return "bg-red-100 text-red-800 ring-1 ring-red-200/80";
    case "overdue":
      return "bg-red-600 text-white ring-1 ring-red-700/40";
    case "unpaid":
    default:
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80";
  }
}

/** 완료=초록, 미납·진행=노랑 계열, 연체·실패=빨강 */
function getStatusAccentBorder(status: FeeMemberRow["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "border-l-emerald-500";
    case "pending":
      return "border-l-amber-300";
    case "failed":
    case "overdue":
      return "border-l-red-500";
    case "unpaid":
    default:
      return "border-l-amber-400";
  }
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatNextRetryAt(ts: FeeMemberRow["nextRetryAt"]): string | null {
  if (!ts || typeof (ts as { toDate?: () => Date }).toDate !== "function") return null;
  const d = (ts as { toDate: () => Date }).toDate();
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function formatChunkAt(ts: FeeMemberRow["lastPaymentChunkAt"]): string | null {
  if (!ts || typeof (ts as { toDate?: () => Date }).toDate !== "function") return null;
  const d = (ts as { toDate: () => Date }).toDate();
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function paidFreshnessLabel(paidAt?: Timestamp): string | null {
  if (!paidAt || typeof paidAt.toDate !== "function") return null;
  const d = paidAt.toDate();
  const diffMs = Date.now() - d.getTime();
  if (diffMs >= 0 && diffMs < 3 * 60 * 1000) return "✔ 방금 납부";
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) return "✔ 오늘 납부 완료";
  return null;
}

function shouldShowReRegisterCTA(row: FeeMemberRow, currentUid: string | undefined): boolean {
  if (!currentUid || row.uid !== currentUid) return false;
  if (row.paymentSource !== "autopay") return false;
  if (row.paymentStatus === "paid" || row.paymentStatus === "pending" || row.paymentStatus === "unpaid") {
    return false;
  }
  return row.retryExhausted === true || row.nextRetryAt == null;
}

async function sendReminder(teamId: string, feeId: string, row: FeeMemberRow) {
  const variant = await resolveNotificationExperimentVariant(teamId, NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1);
  const ab = buildFeeReminderExperimentFields(row.name, variant);
  await addDoc(collection(db, "notifications"), {
    type: "fee_reminder",
    teamId,
    feeId,
    correlationId: buildFeePaymentCorrelationId(feeId, row.uid),
    link: `/team/${encodeURIComponent(teamId)}?tab=home`,
    userId: row.uid,
    targetUid: row.uid,
    experiment: ab.experiment,
    variant: ab.variant,
    title: ab.title,
    body: ab.message,
    message: ab.message,
    isRead: false,
    status: "queued",
    createdAt: serverTimestamp(),
  });
}

/** 멤버 1명 — 정보 + 우측(모바일 하단) 액션 고정 폭 */
export default function TeamFeeMemberPaymentCard({
  teamId,
  feeId,
  row,
  standardMonthlyFee,
  dueDateLabel,
  billingBusyUid,
  canRecordManualPayment = false,
  canMarkYearly = false,
  refundAllocatedWon = 0,
  onReRegister,
  onRefreshPayments,
}: TeamFeeMemberPaymentCardProps) {
  const { user } = useAuth();
  const { policy } = useTeamFeePolicy(teamId);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);
  /** 진행중(pending)인데 오프라인 완납으로 덮어쓸 때만 필요 — 온라인·현금 이중 수납 방지 */
  const [manualOfflineSettlementAck, setManualOfflineSettlementAck] = useState(false);
  const [manualMarking, setManualMarking] = useState(false);
  const [yearlyMarking, setYearlyMarking] = useState(false);
  const [yearlyCanceling, setYearlyCanceling] = useState(false);
  const [yearlyDiscountOpen, setYearlyDiscountOpen] = useState(false);
  const [yearlyCancelOpen, setYearlyCancelOpen] = useState(false);
  const [yearlyDiscountMonths, setYearlyDiscountMonths] = useState(0);
  const [yearlyDiscountMode, setYearlyDiscountMode] = useState<AnnualDiscountMode>("NONE");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundDialogKind, setRefundDialogKind] = useState<"partial" | "full">("partial");
  const [refundPartialAmount, setRefundPartialAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [partialBusy, setPartialBusy] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackAmountInput, setRollbackAmountInput] = useState("");
  const [rollbackBusy, setRollbackBusy] = useState(false);
  /** 연납 클릭 연속·중복 실행 방지 — `yearlyMarking`보다 먼저 막음(리렌더 전 레이스) */
  const yearlyPrepaidSyncLockRef = useRef(false);

  const annualMonths = 12;
  const fixedDiscountMonths = 2;
  const maxAnnualDiscount = Math.min(fixedDiscountMonths, maxSelectableAnnualDiscountMonths(policy));
  const isOverdueForDiscount = row.paymentStatus === "overdue";
  const effectiveMaxAnnualDiscount = isOverdueForDiscount ? 0 : maxAnnualDiscount;
  const allowManualOverride = canRecordManualPayment && policy.annual.allowManualOverride !== false;
  const configuredAnnualDiscount = Math.max(0, Math.min(fixedDiscountMonths, annualMonths - 1));
  const earlyBirdPeriod = policy.annual.earlyBirdPeriod;
  const earlyBirdLabel = earlyBirdPeriod
    ? earlyBirdPeriod.startMonth === earlyBirdPeriod.endMonth
      ? `${earlyBirdPeriod.startMonth}월 한정`
      : `${earlyBirdPeriod.startMonth}~${earlyBirdPeriod.endMonth}월 한정`
    : null;
  const { M: seoulM, d: seoulD } = seoulCalendarFromInstant(Date.now());
  const todayLabel = `${seoulM}월 ${seoulD}일`;
  const discountDeadlineLabel = earlyBirdPeriod
    ? `${earlyBirdPeriod.endMonth}월 말`
    : "정책 미설정";

  useEffect(() => {
    setYearlyDiscountMonths((v) => Math.min(v, effectiveMaxAnnualDiscount));
  }, [effectiveMaxAnnualDiscount]);

  const annualBatchId = String(row.sourceBulkPaymentId ?? "").trim();
  const hasActiveAnnualPayment =
    row.paymentStatus === "paid" &&
    isAnnualPrepaidPaymentSource(row.sourceType) &&
    annualBatchId.length > 0 &&
    (row.annualPrepaidFinalAmount ?? row.originalAmount ?? 0) > 0;
  const yearlyCoveredThisFee = row.duesType === "yearly" && hasActiveAnnualPayment;
  const showYearlyMissingDateBadge = false;
  /** 실제 활성 연납(결제 paid + batch 존재)일 때만 연납 상태로 간주 */
  const isAnnualPrepaid = hasActiveAnnualPayment;
  const canShowAnnualCancel =
    canMarkYearly &&
    isAnnualPrepaidPaymentSource(row.sourceType) &&
    annualBatchId.length > 0 &&
    row.paymentStatus === "paid";
  /** 완납 또는 이미 연납 분해 반영 시 숨김 — 진행중·부분납부여도 버튼은 노출(실행은 서버에서 검증) */
  const showYearlyAction =
    canMarkYearly &&
    row.duesType !== "exempt" &&
    !isAnnualPrepaid &&
    row.paymentStatus !== "paid" &&
    (row.duesType === "monthly" || (row.duesType === "yearly" && !yearlyCoveredThisFee));

  const showManualMark =
    canRecordManualPayment &&
    row.isBillingActionable !== false &&
    (row.paymentStatus === "unpaid" ||
      row.paymentStatus === "failed" ||
      row.paymentStatus === "overdue" ||
      row.paymentStatus === "pending");

  const paidFresh = row.paymentStatus === "paid" ? paidFreshnessLabel(row.paidAt) : null;
  const isCancelledAnnual =
    isAnnualPrepaidPaymentSource(row.sourceType) &&
    (row.paymentStatus === "unpaid" || row.paymentStatus === "overdue" || row.paymentStatus === "failed");
  const annualPrepaidHeadline =
    !isCancelledAnnual &&
    row.discountApplied &&
    typeof row.originalAmount === "number" &&
    typeof row.annualPrepaidFinalAmount === "number"
      ? `연납 ${formatWon(row.originalAmount)}원 → ${formatWon(row.annualPrepaidFinalAmount)}원 (${row.discountMonths ?? 0}개월 할인)`
      : !isCancelledAnnual && isAnnualPrepaid
        ? `연납 ${formatWon(row.annualPrepaidFinalAmount ?? row.originalAmount ?? 0)}원`
        : `${formatWon(row.amount)}원`;

  const monthlyForAnnual = Math.max(
    1,
    Math.floor(Number(row.duesType === "discount" ? row.amount : standardMonthlyFee ?? row.amount) || 0)
  );
  const annualOriginalAmount = monthlyForAnnual * annualMonths;
  const discountCandidates = [0, fixedDiscountMonths].filter((m, idx, arr) => arr.indexOf(m) === idx);
  const discountOptions = discountCandidates
    .filter((m) => m <= effectiveMaxAnnualDiscount)
    .map((m) => {
    const finalAmount = monthlyForAnnual * (annualMonths - m);
    const label =
      m === 0
        ? `할인 없음 (${annualMonths}개월)`
        : `${m}개월 할인 (${annualMonths - m}개월분 납부)${
            earlyBirdLabel ? ` · ${earlyBirdLabel}` : ""
          }`;
    return { discountMonths: m, label, finalAmount };
    });

  const paidBaseWon = Math.max(0, Math.floor(Number(row.amount) || 0));
  const refundedSoFar = Math.max(0, Math.floor(refundAllocatedWon));
  const remainingRefundWon = Math.max(0, paidBaseWon - refundedSoFar);
  /**
   * 연납 분해 행은 `isBillingActionable: false`(납부/부분납부 등 중복 조작 방지)이나,
   * 이번 회차 기준 납부액에 대한 환불 분개는 허용해야 함.
   * 면제(amount 0) 등은 remainingRefundWon < 1 이면 비노출.
   */
  const showRefundActions =
    canRecordManualPayment &&
    row.paymentStatus === "paid" &&
    remainingRefundWon >= 1;

  const maxPartialApplyWon =
    row.feeAmountDueWon != null && row.feeAmountPaidWon != null
      ? Math.max(0, row.feeAmountDueWon - row.feeAmountPaidWon)
      : Math.max(0, Math.floor(Number(row.amount) || 0));
  const maxRollbackWon = Math.max(0, row.feeAmountPaidWon ?? 0);

  const canStaffPartialOps =
    canRecordManualPayment &&
    row.isBillingActionable !== false &&
    row.paymentStatus !== "paid" &&
    !isAnnualPrepaid &&
    row.duesType !== "exempt";

  const showPartialPaymentAction =
    canStaffPartialOps &&
    (row.paymentStatus === "pending" ||
      row.paymentStatus === "unpaid" ||
      row.paymentStatus === "failed" ||
      row.paymentStatus === "overdue");

  const showRollbackAction = canStaffPartialOps && maxRollbackWon >= 1;

  const runYearlyPrepaid = async (discountMonths: number, discountMode: AnnualDiscountMode) => {
    if (yearlyPrepaidSyncLockRef.current) return;
    if (row.paymentStatus === "paid" || isAnnualPrepaid) {
      toast.error("이미 완납되었거나 이 회차에 연납 분해가 반영되어 있습니다.");
      return;
    }
    if (!row.uid?.trim()) {
      toast.error("멤버 식별자가 없어 연납 처리를 진행할 수 없습니다.");
      return;
    }
    if (!String(row.name ?? "").trim() || row.name === "이름없음") {
      toast.error("멤버 이름/연결 정보가 없어 연납 처리할 수 없습니다. 멤버 정보를 먼저 보정해 주세요.");
      return;
    }
    if (!user?.uid) {
      toast.error("로그인이 필요합니다. 다시 로그인 후 시도해 주세요.");
      return;
    }
    if (!teamId?.trim() || !feeId?.trim()) {
      console.error("연납 처리 필수값 누락", { teamId, feeId, memberId: row.uid });
      toast.error("연납 처리에 필요한 회차 정보가 없습니다. 목록을 새로고침 후 다시 시도해 주세요.");
      return;
    }

    yearlyPrepaidSyncLockRef.current = true;
    setYearlyMarking(true);
    try {
      const months = annualMonths;
      const dm =
        discountMode === "NONE"
          ? 0
          : Math.max(0, Math.min(months - 1, Math.min(fixedDiscountMonths, Math.floor(discountMonths))));
      const originalAmount = monthlyForAnnual * months;
      const finalAmount = monthlyForAnnual * (months - dm);
      if (!Number.isFinite(finalAmount) || finalAmount < 1) {
        toast.error("월 회비 금액을 확인할 수 없습니다. 회차 금액 또는 멤버 납부 금액을 확인해 주세요.");
        return;
      }
      const annual = await registerAnnualPrepaidPayment({
        teamId,
        userId: row.uid,
        startFeeId: feeId,
        months,
        totalAmount: finalAmount,
        finalAmount,
        originalAmount,
        discountMonths: dm,
        discountType: discountMode,
        isOverride: discountMode === "MANUAL",
        overrideReason: discountMode === "MANUAL" ? "관리자 수동 할인" : undefined,
        paidAt: new Date().toISOString(),
      });
      toast.success(
        `${row.name}님 — 연납 분해 완료 (생성 ${annual.created}건, 스킵 ${annual.skipped}건).`
      );
      onRefreshPayments?.();
    } catch (e) {
      console.error(e);
      if (e instanceof FirebaseError && e.code === "permission-denied") {
        toast.error("권한이 없어 연납 처리에 실패했습니다. 팀 운영 권한/Rules를 확인해 주세요.");
      } else if (e instanceof FirebaseError && e.code === "functions/not-found") {
        toast.error("연납 서버 함수가 배포되지 않았습니다. 관리자에게 배포를 요청해 주세요.");
      } else {
        toast.error(getRegisterAnnualPrepaidPaymentErrorMessage(e));
      }
    } finally {
      setYearlyMarking(false);
      yearlyPrepaidSyncLockRef.current = false;
    }
  };

  const handleConfirmManualPaid = async () => {
    if (manualMarking) return;
    setManualMarking(true);
    try {
      const res = await recordManualTeamFeePayment({
        teamId,
        feeId,
        targetUid: row.uid,
        ...(row.paymentStatus === "pending" && manualOfflineSettlementAck
          ? { confirmOfflineDespiteOnlinePending: true }
          : {}),
      });
      if (res.alreadyPaid) toast.message("이미 납부 완료로 처리된 멤버입니다.");
      else toast.success(`${row.name}님 납부가 완료되었습니다.`);
      setManualConfirmOpen(false);
      onRefreshPayments?.();
    } catch (e) {
      if (import.meta.env.DEV) {
        const code = e instanceof FirebaseError ? e.code : undefined;
        const message = e instanceof FirebaseError ? e.message : e instanceof Error ? e.message : undefined;
        console.warn("[recordManualTeamFeePayment]", code, message, e);
      }
      toast.error(getRecordManualTeamFeePaymentErrorMessage(e));
    } finally {
      setManualMarking(false);
    }
  };

  const handleCancelYearlyPrepaid = async () => {
    if (yearlyCanceling) return;
    if (!teamId?.trim() || !row.uid?.trim() || !annualBatchId) {
      console.error("연납 취소 필수값 누락", { teamId, memberId: row.uid, annualBatchId });
      toast.error("연납 취소에 필요한 정보가 없습니다.");
      return;
    }
    setYearlyCanceling(true);
    try {
      const res = await cancelAnnualPrepaidPayment({
        teamId,
        memberId: row.uid,
        annualBatchId,
      });
      setYearlyCancelOpen(false);
      toast.success(`연납 취소 완료 (되돌림 ${res.cancelledCount}건, 제외 ${res.skippedCount}건)`);
      onRefreshPayments?.();
    } catch (e) {
      console.error("[cancelAnnualPrepaidPayment]", e);
      toast.error(getCancelAnnualPrepaidPaymentErrorMessage(e));
    } finally {
      setYearlyCanceling(false);
    }
  };

  const submitRefund = async () => {
    if (refundBusy || !row.uid?.trim()) return;
    const reason = refundReason.trim();
    if (reason.length < 2) {
      toast.error("환불 사유를 짧게라도 입력해 주세요.");
      return;
    }
    let amountWon =
      refundDialogKind === "full"
        ? remainingRefundWon
        : Math.floor(Number(refundPartialAmount.replace(/[^\d]/g, "") || "0"));
    if (!Number.isFinite(amountWon) || amountWon < 1) {
      toast.error("환불 금액을 확인해 주세요.");
      return;
    }
    amountWon = Math.min(amountWon, remainingRefundWon);
    setRefundBusy(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `rf_${teamId}_${feeId}_${row.uid}_${Date.now()}`;
      const res = await registerFeeRefund({
        teamId,
        feeId,
        memberId: row.uid.trim(),
        refundAmountWon: amountWon,
        reason,
        idempotencyKey,
      });
      if (res.duplicate) {
        toast.message("동일 요청으로 이미 처리된 환불입니다.");
      } else {
        toast.success("환불이 기록되었습니다. (납부 원본은 수정하지 않습니다)");
      }
      if (res.cashBookSynced === false) {
        toast.message(
          "출납부(현금출납부) 지출 반영에 실패했을 수 있습니다. 잠시 후 같은 버튼으로 다시 시도해 보거나 관리자에게 문의해 주세요."
        );
      }
      setRefundDialogOpen(false);
      setRefundReason("");
      setRefundPartialAmount("");
      onRefreshPayments?.();
    } catch (e) {
      console.error(e);
      if (e instanceof FirebaseError && e.code === "permission-denied") {
        toast.error("권한이 없어 환불 기록에 실패했습니다.");
      } else if (e instanceof FirebaseError && e.code === "functions/not-found") {
        toast.error("환불 서버 함수가 배포되지 않았습니다.");
      } else {
        toast.error(getRegisterFeeRefundErrorMessage(e));
      }
    } finally {
      setRefundBusy(false);
    }
  };

  const submitPartialPayment = async () => {
    if (partialBusy || !row.uid?.trim()) return;
    const n = Math.floor(Number(partialAmountInput.replace(/[^\d]/g, "") || "0"));
    if (!Number.isFinite(n) || n < 1) {
      toast.error("납부 금액을 확인해 주세요.");
      return;
    }
    if (n > maxPartialApplyWon) {
      toast.error(`잔액은 ${formatWon(maxPartialApplyWon)}원 이하로 입력해 주세요.`);
      return;
    }
    setPartialBusy(true);
    try {
      const res = await recordPartialTeamFeePayment({
        teamId,
        feeId,
        targetUid: row.uid.trim(),
        amountChunkWon: n,
      });
      if (!res.success) {
        toast.error("부분납부 반영에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (res.idempotentReplay) {
        toast.message("이미 반영된 납부입니다.");
      } else {
        const partialLabel = row.paymentDocStatus === "partial" ? "추가 납부" : "부분납부";
        toast.success(`${row.name}님 · ${partialLabel} ${formatWon(n)}원 반영`);
      }
      setPartialDialogOpen(false);
      setPartialAmountInput("");
      onRefreshPayments?.();
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[recordPartialTeamFeePayment]", e);
      toast.error(getPartialTeamFeePaymentErrorMessage(e));
    } finally {
      setPartialBusy(false);
    }
  };

  const submitRollbackPartial = async () => {
    if (rollbackBusy || !row.uid?.trim()) return;
    const n = Math.floor(Number(rollbackAmountInput.replace(/[^\d]/g, "") || "0"));
    if (!Number.isFinite(n) || n < 1) {
      toast.error("되돌릴 금액을 확인해 주세요.");
      return;
    }
    if (n > maxRollbackWon) {
      toast.error(`되돌릴 수 있는 금액은 최대 ${formatWon(maxRollbackWon)}원입니다.`);
      return;
    }
    setRollbackBusy(true);
    try {
      const res = await rollbackPartialTeamFeePayment({
        teamId,
        feeId,
        targetUid: row.uid.trim(),
        amountChunkWon: n,
      });
      if (!res.success) {
        toast.error("롤백 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (res.idempotentReplay) {
        toast.message("이미 반영된 롤백입니다.");
      } else {
        toast.success(`${row.name}님 · 납부 ${formatWon(n)}원 롤백 반영`);
      }
      setRollbackDialogOpen(false);
      setRollbackAmountInput("");
      onRefreshPayments?.();
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[rollbackPartialTeamFeePayment]", e);
      toast.error(getPartialTeamFeePaymentErrorMessage(e));
    } finally {
      setRollbackBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 border-l-4 py-4 pl-4 pr-4 sm:flex-row sm:items-stretch sm:justify-between sm:pl-5 ${getStatusAccentBorder(
        row.paymentStatus
      )}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{row.name}</span>
          {row.duesLabel ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              {row.duesLabel}
            </span>
          ) : null}
          {showYearlyMissingDateBadge ? (
            <span
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-200"
              title="연납으로 표시돼 있으나 납부일이 없어 월별 정산이 막힐 수 있어요."
            >
              연납 · 납부일 없음
            </span>
          ) : null}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(row.paymentStatus)}`}
          >
            {row.paymentDocStatus === "partial"
              ? `${getStatusLabel(row.paymentStatus)} · 부분납부`
              : getStatusLabel(row.paymentStatus)}
          </span>
          {isAnnualPrepaid ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-900 ring-1 ring-violet-200">
              연납 분해
            </span>
          ) : null}
        </div>
        {row.billingNote ? (
          <p className="mt-1 text-xs font-medium text-slate-600">{row.billingNote}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-base font-bold tabular-nums text-slate-900">{annualPrepaidHeadline}</p>
          {dueDateLabel ? (
            <p className="text-sm text-slate-600">
              마감 <span className="font-semibold text-slate-800">{dueDateLabel}</span>
            </p>
          ) : null}
        </div>
        {row.feeAmountDueWon != null &&
        row.feeAmountPaidWon != null &&
        row.paymentStatus !== "paid" &&
        !isAnnualPrepaid ? (
          <p className="mt-1 text-xs font-medium text-slate-700">
            청구{" "}
            <span className="tabular-nums font-semibold text-slate-900">{formatWon(row.feeAmountDueWon)}</span>원 ·
            누적 납부{" "}
            <span className="tabular-nums font-semibold text-slate-900">{formatWon(row.feeAmountPaidWon)}</span>원 ·
            잔액{" "}
            <span className="tabular-nums font-semibold text-rose-600">
              {formatWon(Math.max(0, row.feeAmountDueWon - row.feeAmountPaidWon))}
            </span>
            원
          </p>
        ) : null}
        {row.lastPaymentChunkAmount != null && row.lastPaymentChunkAmount > 0 && !isAnnualPrepaid ? (
          <p className="mt-0.5 text-[11px] text-slate-500">
            마지막 입금 청크 {formatWon(row.lastPaymentChunkAmount)}원
            {formatChunkAt(row.lastPaymentChunkAt) ? ` · ${formatChunkAt(row.lastPaymentChunkAt)}` : ""}
          </p>
        ) : null}
        {isAnnualPrepaid ? (
          <p className="mt-1 text-xs font-medium text-violet-700">
            {annualMonths}개월 분배 적용 · 이번 회차 {formatWon(row.amount)}원 분배
          </p>
        ) : null}
        {refundedSoFar > 0 ? (
          <p className="mt-1 text-xs font-medium text-rose-700">
            환불 반영 {formatWon(refundedSoFar)}원
            {remainingRefundWon > 0 ? ` · 추가 환불 가능 ${formatWon(remainingRefundWon)}원` : " · 한도 소진"}
          </p>
        ) : null}
        {isCancelledAnnual ? (
          <p className="mt-1 text-xs font-semibold text-amber-700">연납 처리 취소됨</p>
        ) : null}
        {row.paymentStatus === "paid" && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {paidFresh ? <span className="text-sm font-medium text-emerald-700">{paidFresh}</span> : null}
            {row.settledManually ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                수동 반영
              </span>
            ) : null}
          </div>
        )}
        {row.paymentStatus === "overdue" && row.overdueDays != null && (
          <div className="mt-1 text-sm font-medium text-red-600">연체 {row.overdueDays}일째</div>
        )}
        {row.paymentStatus === "overdue" && row.failReason && (
          <div className="mt-1 text-xs text-red-500">이전 결제 실패: {row.failReason}</div>
        )}
        {row.paymentStatus === "failed" && (
          <div className="mt-1 text-xs text-red-600">
            {(row.failCode || "ERROR") + " / " + (row.failReason || "결제 실패")}
          </div>
        )}
        {row.paymentSource === "autopay" && (row.paymentStatus === "failed" || row.paymentStatus === "overdue") && (
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            <div>결제 수단: 자동결제</div>
            {typeof row.chargeAttemptCount === "number" && <div>시도 횟수: {row.chargeAttemptCount}회</div>}
            {formatNextRetryAt(row.nextRetryAt) && !row.retryExhausted && (
              <div className="text-amber-800">재시도 예정: {formatNextRetryAt(row.nextRetryAt)}</div>
            )}
            {row.retryExhausted && (
              <div className="font-medium text-red-700">
                자동 재시도 종료 — 카드 재등록 또는 수동 납부가 필요합니다.
              </div>
            )}
            {row.retryExhausted &&
              row.uid !== user?.uid &&
              (row.paymentStatus === "failed" || row.paymentStatus === "overdue") && (
                <div className="text-xs text-slate-500">
                  해당 멤버 본인 계정으로 로그인한 뒤 카드를 재등록해야 합니다.
                </div>
              )}
          </div>
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44 sm:items-stretch">
        {shouldShowReRegisterCTA(row, user?.uid) && (
          <button
            type="button"
            disabled={billingBusyUid === row.uid}
            onClick={() => onReRegister()}
            className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            {billingBusyUid === row.uid ? "이동 중…" : "카드 다시 등록"}
          </button>
        )}

        {canShowAnnualCancel && (
          <>
            <div className="min-h-[40px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-900">
              연납 완료 ✓
            </div>
            <button
              type="button"
              disabled={yearlyCanceling || !annualBatchId}
              onClick={() => setYearlyCancelOpen(true)}
              className="min-h-[42px] rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
            >
              {yearlyCanceling ? "취소 처리 중…" : "연납 취소"}
            </button>
          </>
        )}

        {showYearlyAction && policy.annual.enabled && (
          <button
            type="button"
            disabled={yearlyMarking}
            onClick={() => {
              const def = Math.min(configuredAnnualDiscount, effectiveMaxAnnualDiscount);
              setYearlyDiscountMode("NONE");
              setYearlyDiscountMonths(def);
              setYearlyDiscountOpen(true);
            }}
            className="min-h-[44px] rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-950 shadow-sm hover:bg-violet-100 disabled:opacity-50"
          >
            {yearlyMarking ? "처리 중…" : "연납 처리"}
          </button>
        )}

        {showManualMark && (
          <button
            type="button"
            disabled={manualMarking || manualConfirmOpen}
            onClick={() => {
              setManualOfflineSettlementAck(false);
              setManualConfirmOpen(true);
            }}
            className="min-h-[44px] rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-100 disabled:opacity-50"
          >
            납부 처리
          </button>
        )}

        {showPartialPaymentAction && (
          <button
            type="button"
            disabled={partialBusy || partialDialogOpen}
            onClick={() => {
              setPartialAmountInput(maxPartialApplyWon > 0 ? String(maxPartialApplyWon) : "");
              setPartialDialogOpen(true);
            }}
            className="min-h-[44px] rounded-xl border border-sky-500 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-950 shadow-sm hover:bg-sky-100 disabled:opacity-50"
          >
            {row.paymentDocStatus === "partial" ? "추가 납부" : "부분납부"}
          </button>
        )}

        {showRollbackAction && (
          <button
            type="button"
            disabled={rollbackBusy || rollbackDialogOpen}
            onClick={() => {
              setRollbackAmountInput("");
              setRollbackDialogOpen(true);
            }}
            className="min-h-[44px] rounded-xl border border-amber-600 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-50"
          >
            납부 롤백
          </button>
        )}

        {showRefundActions && (
          <>
            <button
              type="button"
              disabled={refundBusy || refundDialogOpen}
              onClick={() => {
                setRefundDialogKind("partial");
                setRefundPartialAmount("");
                setRefundReason("");
                setRefundDialogOpen(true);
              }}
              className="min-h-[44px] rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-950 shadow-sm hover:bg-rose-100 disabled:opacity-50"
            >
              부분 환불
            </button>
            <button
              type="button"
              disabled={refundBusy || refundDialogOpen}
              onClick={() => {
                setRefundDialogKind("full");
                setRefundPartialAmount(String(remainingRefundWon));
                setRefundReason("");
                setRefundDialogOpen(true);
              }}
              className="min-h-[44px] rounded-xl border border-rose-400 bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-950 shadow-sm hover:bg-rose-200 disabled:opacity-50"
            >
              전체 환불
            </button>
          </>
        )}

        {row.isBillingActionable !== false &&
          (row.paymentStatus === "unpaid" || row.paymentStatus === "failed" || row.paymentStatus === "overdue") && (
          <button
            type="button"
            onClick={() => void sendReminder(teamId, feeId, row)}
            className="min-h-[44px] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            독촉 보내기
          </button>
        )}
      </div>

      {yearlyDiscountOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !yearlyMarking && setYearlyDiscountOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`yearly-discount-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`yearly-discount-title-${row.uid}`} className="text-base font-bold text-slate-900">
              연납 조기 납부 할인
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{row.name}</span>님 · 월{" "}
              <span className="font-semibold tabular-nums">{formatWon(monthlyForAnnual)}</span>원 기준{" "}
              {annualMonths}개월
            </p>
            <p className="mt-1 text-xs text-slate-500">연납은 시즌 기준(1월~12월)으로 계산됩니다.</p>
            <div className="mt-4 space-y-2">
              {discountOptions.map((opt) => {
                return (
                  <label
                    key={opt.discountMonths}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      yearlyDiscountMonths === opt.discountMonths
                        ? "border-violet-500 bg-violet-50 font-semibold text-violet-950"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`yearly-discount-${row.uid}`}
                      checked={
                        yearlyDiscountMonths === opt.discountMonths &&
                        (opt.discountMonths === 0
                          ? yearlyDiscountMode === "NONE"
                          : yearlyDiscountMode === "EARLY_BIRD")
                      }
                      onChange={() => {
                        setYearlyDiscountMode(opt.discountMonths > 0 ? "EARLY_BIRD" : "NONE");
                        setYearlyDiscountMonths(opt.discountMonths);
                      }}
                      className="h-4 w-4 border-slate-300 text-violet-600"
                    />
                    <span className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {formatWon(annualOriginalAmount)}원 → {formatWon(opt.finalAmount)}원
                      </span>
                    </span>
                  </label>
                );
              })}
              {allowManualOverride && configuredAnnualDiscount > 0 ? (
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                    yearlyDiscountMode === "MANUAL"
                      ? "border-violet-500 bg-violet-50 font-semibold text-violet-950"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={`yearly-discount-${row.uid}`}
                    checked={yearlyDiscountMode === "MANUAL"}
                    onChange={() => {
                      setYearlyDiscountMode("MANUAL");
                      setYearlyDiscountMonths(configuredAnnualDiscount);
                    }}
                    className="h-4 w-4 border-slate-300 text-violet-600"
                  />
                  <span className="flex flex-col">
                    <span>관리자 할인 적용 (override)</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {formatWon(annualOriginalAmount)}원 →{" "}
                      {formatWon(monthlyForAnnual * (annualMonths - configuredAnnualDiscount))}원
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
            {isOverdueForDiscount ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                <p className="font-semibold">연납 할인 불가 (기한 초과)</p>
                <p className="mt-0.5">할인 마감: {discountDeadlineLabel}</p>
                <p className="mt-0.5">현재 날짜: {todayLabel}</p>
              </div>
            ) : null}
            {configuredAnnualDiscount > 0 && effectiveMaxAnnualDiscount === 0 && earlyBirdLabel && !isOverdueForDiscount ? (
              <p className="mt-2 text-xs text-amber-700">
                조기납부 할인은 현재 기간이 아닙니다. 정책 기준: {earlyBirdLabel}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              합계{" "}
              <span className="font-semibold tabular-nums text-slate-800">
                {formatWon(annualOriginalAmount)}원
              </span>
              {" → "}
              <span className="font-semibold tabular-nums text-violet-800">
                {formatWon(monthlyForAnnual * (annualMonths - yearlyDiscountMonths))}원
              </span>
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={yearlyMarking}
                onClick={() => setYearlyDiscountOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={yearlyMarking}
                onClick={() => {
                  const dm = yearlyDiscountMonths;
                  const mode = yearlyDiscountMode;
                  setYearlyDiscountOpen(false);
                  void runYearlyPrepaid(dm, mode);
                }}
                className="min-h-[44px] flex-1 rounded-xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {yearlyMarking ? "처리 중…" : "연납 처리"}
              </button>
            </div>
          </div>
        </div>
      )}

      {yearlyCancelOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !yearlyCanceling && setYearlyCancelOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`yearly-cancel-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`yearly-cancel-title-${row.uid}`} className="text-base font-bold text-slate-900">
              연납 처리를 취소할까요?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              이 멤버의 12개월 납부 처리와 연납 할인 기록이 되돌려집니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={yearlyCanceling}
                onClick={() => setYearlyCancelOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={yearlyCanceling || !annualBatchId}
                onClick={() => void handleCancelYearlyPrepaid()}
                className="min-h-[44px] flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {yearlyCanceling ? "처리 중…" : "연납 취소"}
              </button>
            </div>
          </div>
        </div>
      )}

      {refundDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !refundBusy && setRefundDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`refund-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`refund-title-${row.uid}`} className="text-base font-bold text-slate-900">
              {refundDialogKind === "full" ? "전체 환불 기록" : "부분 환불 기록"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{row.name}</span>님 · 이번 회차 한도{" "}
              <span className="font-semibold tabular-nums text-rose-800">{formatWon(remainingRefundWon)}원</span>
            </p>
            {refundDialogKind === "partial" ? (
              <label className="mt-4 block text-sm font-medium text-slate-800">
                환불 금액 (원)
                <input
                  type="text"
                  inputMode="numeric"
                  value={refundPartialAmount}
                  onChange={(e) => setRefundPartialAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums outline-none ring-rose-200 focus:border-rose-400 focus:ring-2"
                  placeholder="예: 10000"
                  autoComplete="off"
                />
              </label>
            ) : (
              <p className="mt-4 text-sm font-semibold tabular-nums text-slate-900">
                환불 금액 {formatWon(remainingRefundWon)}원 (전액)
              </p>
            )}
            <label className="mt-3 block text-sm font-medium text-slate-800">
              사유
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-rose-200 focus:border-rose-400 focus:ring-2"
                placeholder="간단히 적어 주세요 (감사·내부 기록용)"
              />
            </label>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              실제 계좌 송금 여부는 팀에서 별도 처리합니다. 여기서는 장부·KPI용 환불 분개만 남깁니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={refundBusy}
                onClick={() => setRefundDialogOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={refundBusy}
                onClick={() => void submitRefund()}
                className="min-h-[44px] flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {refundBusy ? "처리 중…" : "환불 기록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {partialDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !partialBusy && setPartialDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`partial-pay-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`partial-pay-title-${row.uid}`} className="text-base font-bold text-slate-900">
              {row.paymentDocStatus === "partial" ? "추가 납부 기록" : "부분납부 기록"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{row.name}</span>님 · 이번 회차 잔액 최대{" "}
              <span className="font-semibold tabular-nums text-sky-900">{formatWon(maxPartialApplyWon)}</span>원
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-800">
              입금 금액 (원)
              <input
                type="text"
                inputMode="numeric"
                value={partialAmountInput}
                onChange={(e) => setPartialAmountInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums outline-none ring-sky-200 focus:border-sky-500 focus:ring-2"
                placeholder="예: 10000"
                autoComplete="off"
              />
            </label>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              현금·계좌이체 등 오프라인 입금분만 기록합니다. 장부에는 입금 청크 단위로 반영됩니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={partialBusy}
                onClick={() => setPartialDialogOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={partialBusy || maxPartialApplyWon < 1}
                onClick={() => void submitPartialPayment()}
                className="min-h-[44px] flex-1 rounded-xl bg-sky-600 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {partialBusy ? "처리 중…" : "반영"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rollbackDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !rollbackBusy && setRollbackDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`rollback-partial-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`rollback-partial-title-${row.uid}`} className="text-base font-bold text-slate-900">
              부분납부 롤백
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{row.name}</span>님 · 되돌릴 수 있는 누적 납부 최대{" "}
              <span className="font-semibold tabular-nums text-amber-900">{formatWon(maxRollbackWon)}</span>원
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-800">
              되돌릴 금액 (원)
              <input
                type="text"
                inputMode="numeric"
                value={rollbackAmountInput}
                onChange={(e) => setRollbackAmountInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 tabular-nums outline-none ring-amber-200 focus:border-amber-500 focus:ring-2"
                placeholder="예: 10000"
                autoComplete="off"
              />
            </label>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              롤백 시 장부에는 동일 금액이 환급(지출)로 기록됩니다. 실제 계좌 송금은 팀에서 별도 처리해 주세요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={rollbackBusy}
                onClick={() => setRollbackDialogOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={rollbackBusy || maxRollbackWon < 1}
                onClick={() => void submitRollbackPartial()}
                className="min-h-[44px] flex-1 rounded-xl bg-amber-700 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {rollbackBusy ? "처리 중…" : "롤백"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manualConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => !manualMarking && setManualConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`manual-fee-title-${row.uid}`}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`manual-fee-title-${row.uid}`} className="text-base font-bold text-slate-900">
              회비 완납(정산)으로 기록할까요?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{row.name}</span>님 ·{" "}
              <span className="font-semibold tabular-nums">{formatWon(row.amount)}원</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              현금·계좌이체 등 오프라인으로 받은 회비를 완납으로 반영합니다. 기록은 감사 로그에도 저장됩니다.
            </p>
            {row.paymentStatus === "pending" ? (
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
                  checked={manualOfflineSettlementAck}
                  onChange={(e) => setManualOfflineSettlementAck(e.target.checked)}
                />
                <span>
                  온라인 결제와 중복되지 않았음을 확인했습니다. (진행 중인 카드·간편결제 없이 오프라인으로만
                  받은 경우에만 체크)
                </span>
              </label>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={manualMarking}
                onClick={() => {
                  setManualOfflineSettlementAck(false);
                  setManualConfirmOpen(false);
                }}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={
                  manualMarking || (row.paymentStatus === "pending" && !manualOfflineSettlementAck)
                }
                onClick={() => void handleConfirmManualPaid()}
                className="min-h-[44px] flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {manualMarking ? "처리 중…" : "확인 · 완납 기록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
