import {
  collection,
  getDocs,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FeePayment, TeamMember } from "@/features/fees/types";
import { getMemberBillingUid } from "@/lib/team/memberBillingUid";
import {
  normalizeTeamFeePaymentStatus,
  parsePaymentDocUserIdWithKnownFeeId,
  parseTeamFeePaymentDocId,
} from "@/lib/fees/teamFeePaymentDocId";
import { normalizeMemberDuesType } from "@/types/memberDues";

function feePaymentFromDoc(item: QueryDocumentSnapshot): FeePayment | null {
  const data = item.data();
  const feeIdFromField = typeof data.feeId === "string" ? data.feeId.trim() : "";
  const parsedUid =
    (feeIdFromField ? parsePaymentDocUserIdWithKnownFeeId(item.id, feeIdFromField) : null)?.trim() ||
    parseTeamFeePaymentDocId(item.id)?.userId?.trim() ||
    "";
  const fromField =
    (typeof data.memberId === "string" && data.memberId.trim()) ||
    (typeof data.userId === "string" && data.userId.trim()) ||
    "";
  const memberId = (fromField || parsedUid).trim();
  if (!memberId) return null;
  const status = normalizeTeamFeePaymentStatus(data.status);
  return {
    id: item.id,
    ...(feeIdFromField ? { feeId: feeIdFromField } : {}),
    uid: memberId,
    memberId,
    memberName: data.memberName ? String(data.memberName) : undefined,
    amount: Number(data.amount ?? 0),
    ...(typeof data.amountDue === "number" && Number.isFinite(data.amountDue)
      ? { amountDue: Math.max(0, Math.floor(data.amountDue)) }
      : {}),
    ...(typeof data.amountPaid === "number" && Number.isFinite(data.amountPaid)
      ? { amountPaid: Math.max(0, Math.floor(data.amountPaid)) }
      : {}),
    status,
    paidAt: data.paidAt,
    requestedAt: data.requestedAt,
    updatedAt: data.updatedAt,
    failCode: data.failCode ? String(data.failCode) : undefined,
    failReason: data.failReason ? String(data.failReason) : undefined,
    orderId: data.orderId ? String(data.orderId) : undefined,
    source:
      data.source === "autopay"
        ? "autopay"
        : data.source === "manual"
          ? "manual"
          : data.source === "annual"
            ? "annual"
            : undefined,
    sourceType:
      data.sourceType === "annual_prepaid" || data.sourceType === "annual_prepaid_split"
        ? data.sourceType
        : undefined,
    sourceBulkPaymentId: data.sourceBulkPaymentId ? String(data.sourceBulkPaymentId) : undefined,
    annualBatchId: data.annualBatchId ? String(data.annualBatchId) : undefined,
    allocatedFromAmount:
      typeof data.allocatedFromAmount === "number" && Number.isFinite(data.allocatedFromAmount)
        ? data.allocatedFromAmount
        : undefined,
    originalAmount:
      typeof data.originalAmount === "number" && Number.isFinite(data.originalAmount)
        ? Math.floor(data.originalAmount)
        : undefined,
    finalAmount:
      typeof data.finalAmount === "number" && Number.isFinite(data.finalAmount)
        ? Math.floor(data.finalAmount)
        : undefined,
    discountMonths:
      typeof data.discountMonths === "number" && Number.isFinite(data.discountMonths)
        ? Math.floor(data.discountMonths)
        : undefined,
    discountApplied: data.discountApplied === true,
    policySnapshot:
      data.policySnapshot &&
      typeof data.policySnapshot === "object" &&
      typeof (data.policySnapshot as { monthlyAmount?: unknown }).monthlyAmount === "number"
        ? {
            monthlyAmount: Math.floor(
              Number((data.policySnapshot as { monthlyAmount: number }).monthlyAmount)
            ),
            discountMonths: Math.floor(
              Number((data.policySnapshot as { discountMonths?: number }).discountMonths ?? 0)
            ),
          }
        : undefined,
    billingProfileUid: data.billingProfileUid ? String(data.billingProfileUid) : undefined,
    chargeAttemptCount:
      typeof data.chargeAttemptCount === "number" && Number.isFinite(data.chargeAttemptCount)
        ? data.chargeAttemptCount
        : undefined,
    nextRetryAt: data.nextRetryAt,
    autopayRunId: data.autopayRunId != null ? String(data.autopayRunId) : undefined,
    retryExhausted: data.retryExhausted === true,
    lastFailedAt: data.lastFailedAt,
    lastRetryScheduledAt: data.lastRetryScheduledAt,
    nonResponderReminderHistory:
      data.nonResponderReminderHistory && typeof data.nonResponderReminderHistory === "object"
        ? (data.nonResponderReminderHistory as FeePayment["nonResponderReminderHistory"])
        : undefined,
    nonResponderReminderUpdatedAt: data.nonResponderReminderUpdatedAt,
  };
}

function resolveFeeIdFromPaymentDoc(item: QueryDocumentSnapshot): string {
  const data = item.data();
  const fromField = typeof data.feeId === "string" ? data.feeId.trim() : "";
  if (fromField) return fromField;
  return parseTeamFeePaymentDocId(item.id)?.feeId ?? "";
}

/** `useTeamMembers`와 동일 조건·매핑(일회성 조회) */
export async function fetchActiveTeamMembersForFeeRollup(teamId: string): Promise<TeamMember[]> {
  const q = query(collection(db, "teams", teamId, "members"), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.docs.map((docItem) => {
    const data = docItem.data();
    const roleRaw = String(data.role ?? "member").toLowerCase();
    const role =
      roleRaw === "owner" || roleRaw === "manager" || roleRaw === "member"
        ? roleRaw
        : roleRaw === "admin"
          ? "manager"
          : "member";
    const authFields =
      (typeof data.userId === "string" && data.userId.trim()) ||
      (typeof data.uid === "string" && data.uid.trim()) ||
      "";
    const billingUid = getMemberBillingUid(data as { userId?: unknown; uid?: unknown }, docItem.id);
    const linkedAuthUid = authFields || undefined;
    const duesRaw =
      data.duesType ??
      (typeof (data as Record<string, unknown>).dueType === "string"
        ? (data as Record<string, unknown>).dueType
        : undefined) ??
      data.feePlan;
    return {
      uid: billingUid,
      memberDocumentId: docItem.id,
      linkedAuthUid,
      name: String(data.name ?? data.displayName ?? data.userName ?? "이름없음"),
      role,
      joinedAt: data.joinedAt,
      duesType: normalizeMemberDuesType(duesRaw),
      yearlyPaidAt:
        (data.yearlyPaidAt as TeamMember["yearlyPaidAt"]) ??
        (data.annualPaidAt as TeamMember["yearlyPaidAt"]),
      discountAmount:
        typeof data.discountAmount === "number" && Number.isFinite(data.discountAmount)
          ? Math.max(0, Math.floor(data.discountAmount))
          : undefined,
      discountLabel:
        typeof data.discountLabel === "string" && data.discountLabel.trim()
          ? data.discountLabel.trim()
          : undefined,
    };
  });
}

/** 팀 전체 납부 문서를 feeId별로 그룹화 */
export async function fetchTeamPaymentsByFeeId(teamId: string): Promise<Record<string, FeePayment[]>> {
  const snap = await getDocs(collection(db, "teams", teamId, "payments"));
  const byFee: Record<string, FeePayment[]> = {};
  for (const item of snap.docs) {
    const feeId = resolveFeeIdFromPaymentDoc(item);
    if (!feeId) continue;
    const p = feePaymentFromDoc(item);
    if (!p) continue;
    const list = byFee[feeId] ?? [];
    list.push(p);
    byFee[feeId] = list;
  }
  return byFee;
}
