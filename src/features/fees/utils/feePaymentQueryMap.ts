import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  normalizeTeamFeePaymentStatus,
  parsePaymentDocUserIdWithKnownFeeId,
  parseTeamFeePaymentDocId,
} from "@/lib/fees/teamFeePaymentDocId";
import type { FeePayment } from "../types";

/** `useFeePayments` / 다중 회차 구독에서 공통 사용 — Query 스냅샷 → FeePayment[] */
export function mapPaymentQuerySnapshotDocsToFeePayments(
  docs: readonly QueryDocumentSnapshot[],
  feeIdForQuery: string
): FeePayment[] {
  const next: FeePayment[] = [];
  const feeIdQ = String(feeIdForQuery || "").trim();

  for (const item of docs) {
    const data = item.data();
    const feeIdFromField = typeof data.feeId === "string" ? data.feeId.trim() : "";
    const parsedUid =
      (feeIdQ ? parsePaymentDocUserIdWithKnownFeeId(item.id, feeIdQ) : null)?.trim() ||
      (feeIdFromField ? parsePaymentDocUserIdWithKnownFeeId(item.id, feeIdFromField) : null)?.trim() ||
      parseTeamFeePaymentDocId(item.id)?.userId?.trim() ||
      "";
    const fromField =
      (typeof data.memberId === "string" && data.memberId.trim()) ||
      (typeof data.userId === "string" && data.userId.trim()) ||
      "";
    const memberId = (fromField || parsedUid).trim();
    if (!memberId) {
      console.warn("[feePaymentQueryMap] Invalid payment — missing memberId/userId and doc id (skipped)", {
        paymentId: item.id,
        feeId: data.feeId,
      });
      continue;
    }
    const trivialLocalGuestMismatch =
      Boolean(fromField && parsedUid && parsedUid !== fromField) &&
      fromField.startsWith("local_") &&
      fromField === `local_${parsedUid}`;
    if (fromField && parsedUid && parsedUid !== fromField && !trivialLocalGuestMismatch) {
      console.warn("[feePaymentQueryMap] docId user segment ≠ memberId/userId field", {
        paymentId: item.id,
        docIdUser: parsedUid,
        fieldUser: fromField,
      });
    }
    const status = normalizeTeamFeePaymentStatus(data.status);
    next.push({
      id: item.id,
      feeId: feeIdFromField || feeIdQ,
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
              monthlyAmount: Math.floor(Number((data.policySnapshot as { monthlyAmount: number }).monthlyAmount)),
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
      ...(data.lastPaymentChunkAt != null
        ? { lastPaymentChunkAt: data.lastPaymentChunkAt as FeePayment["lastPaymentChunkAt"] }
        : {}),
      ...(typeof data.lastPaymentChunkAmount === "number" && Number.isFinite(data.lastPaymentChunkAmount)
        ? { lastPaymentChunkAmount: Math.floor(data.lastPaymentChunkAmount) }
        : {}),
    });
  }
  return next;
}
