/**
 * 초대 수락·전화 연결 등으로 멤버가 active가 된 뒤, 기존 오픈 회차에 대한 payments 보강 시드.
 * `onFeeCreatedSeedTeamPayments`·클라 `seedPaymentsForFee`와 동일한 금액·상태 규칙(멱등 merge).
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { buildTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";

const MAX_BATCH = 400;

type MemberDuesType = "monthly" | "yearly" | "exempt" | "discount";

function normalizeMemberDuesType(raw: unknown): MemberDuesType {
  if (raw === "yearly" || raw === "annual") return "yearly";
  if (raw === "exempt") return "exempt";
  if (raw === "discount") return "discount";
  return "monthly";
}

function toJsDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof admin.firestore.Timestamp) {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

function yearlyDuesCoversFeeCalendarYear(yearlyPaidAt: unknown, feeDueYear: number): boolean {
  const d = toJsDate(yearlyPaidAt);
  if (!d || !Number.isFinite(feeDueYear)) return false;
  return d.getFullYear() === feeDueYear;
}

/** 클라 `getMemberBillingUid`와 동일 — payments 문서 ID 접미 */
function getMemberBillingUid(data: Record<string, unknown>, memberDocumentId: string): string {
  const authUid =
    (typeof data.userId === "string" && data.userId.trim()) ||
    (typeof data.uid === "string" && data.uid.trim()) ||
    "";
  return authUid || memberDocumentId;
}

export async function seedOpenFeesForActiveMember(
  db: admin.firestore.Firestore,
  teamId: string,
  memberDocId: string,
  memberData: Record<string, unknown>
): Promise<{ feesScanned: number; paymentsMerged: number }> {
  if (!teamId?.trim() || !memberDocId?.trim()) {
    return { feesScanned: 0, paymentsMerged: 0 };
  }
  if (memberData.isDeleted === true) {
    return { feesScanned: 0, paymentsMerged: 0 };
  }
  if (String(memberData.status ?? "").toLowerCase() !== "active") {
    return { feesScanned: 0, paymentsMerged: 0 };
  }

  const feesSnap = await db.collection("teams").doc(teamId).collection("fees").limit(200).get();

  const userId = getMemberBillingUid(memberData, memberDocId);
  const duesType = normalizeMemberDuesType(memberData.duesType ?? memberData.feePlan);
  const discountAmountRaw =
    typeof memberData.discountAmount === "number" && Number.isFinite(memberData.discountAmount)
      ? Math.floor(memberData.discountAmount)
      : NaN;
  const discountAmount = Number.isFinite(discountAmountRaw) && discountAmountRaw > 0 ? discountAmountRaw : null;

  const name =
    (typeof memberData.name === "string" && memberData.name.trim()) ||
    (typeof memberData.displayName === "string" && memberData.displayName.trim()) ||
    "";

  let batch = db.batch();
  let ops = 0;
  let paymentsMerged = 0;
  let feesScanned = 0;

  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  for (const feeDoc of feesSnap.docs) {
    const feeId = feeDoc.id;
    const fee = feeDoc.data() as Record<string, unknown>;
    const statusRaw = String(fee.status ?? "open").trim().toLowerCase();
    if (statusRaw === "closed") continue;

    const feeAmount = Math.floor(Number(fee.amount) || 0);
    if (feeAmount < 1) continue;

    feesScanned += 1;

    const dueTs = fee.dueDate as admin.firestore.Timestamp | undefined;
    const due = dueTs?.toDate?.() instanceof Date ? dueTs.toDate() : new Date();
    const feeDueYear = due.getFullYear();

    let payStatus: "pending" | "paid" = "pending";
    let amount = feeAmount;

    if (duesType === "exempt") {
      payStatus = "paid";
      amount = 0;
    } else if (duesType === "discount") {
      payStatus = "pending";
      amount = discountAmount ?? feeAmount;
    } else if (duesType === "yearly") {
      if (yearlyDuesCoversFeeCalendarYear(memberData.yearlyPaidAt ?? memberData.annualPaidAt, feeDueYear)) {
        payStatus = "paid";
        amount = 0;
      } else {
        payStatus = "pending";
        amount = feeAmount;
      }
    }

    const paymentId = buildTeamFeePaymentDocId(feeId, userId);
    const ref = db.collection("teams").doc(teamId).collection("payments").doc(paymentId);
    const existingPay = await ref.get();
    if (existingPay.exists) {
      const pd = existingPay.data() as Record<string, unknown>;
      if (String(pd.feeId ?? "") === feeId) {
        continue;
      }
    }

    const amountDue = amount;
    const amountPaid = payStatus === "paid" ? amount : 0;

    const payload: Record<string, unknown> = {
      teamId,
      feeId,
      userId,
      duesType,
      amount,
      amountDue,
      amountPaid,
      status: payStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existingPay.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
    }

    if (duesType === "discount" && discountAmount != null) payload.discountAmount = discountAmount;
    if (typeof memberData.discountLabel === "string" && memberData.discountLabel.trim()) {
      payload.discountLabel = memberData.discountLabel.trim();
    }
    if (name) payload.memberName = name;

    batch.set(ref, payload, { merge: true });
    ops++;
    paymentsMerged++;
    if (ops >= MAX_BATCH) await flush();
  }

  await flush();

  if (feesScanned > 0) {
    logger.info("[seedOpenFeesForActiveMember] seed payments for newly active member", {
      teamId,
      memberDocId,
      billingUid: userId,
      feesScanned,
      paymentsMerged,
    });
  }

  return { feesScanned, paymentsMerged };
}
