import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { buildTeamFeePaymentDocId } from "@/lib/fees/teamFeePaymentDocId";
import { teamFeeSeoulCalendarYear } from "@/lib/fees/seoulFeeMonthKey";
import { getMemberBillingUid } from "@/lib/team/memberBillingUid";
import { yearlyDuesCoversFeeCalendarYear, normalizeMemberDuesType, type MemberDuesType } from "@/types/memberDues";

const MAX_BATCH = 400;

export type SeedFeeInput = {
  id: string;
  amount: number;
  dueDate: Timestamp | Date;
};

function seedFeeDueDate(value: Timestamp | Date): Date {
  const d = firestoreLikeToDate(value as unknown);
  return d ?? new Date();
}

/**
 * 회비(fee) 생성 직후에만 호출: 활성 멤버마다 납부 SoT `teams/{teamId}/payments/{feeId}_{userId}` 생성·갱신 (merge).
 * 문서 ID는 랜덤 `addDoc`가 아니라 `feeId_userId` 고정 ID — 결제·웹훅·CF와 동일 키.
 */
export async function seedPaymentsForFee(teamId: string, fee: SeedFeeInput): Promise<void> {
  const membersSnap = await getDocs(collection(db, "teams", teamId, "members"));
  const due = seedFeeDueDate(fee.dueDate);
  const feeDueYear = teamFeeSeoulCalendarYear(due);
  const feeAmount = Math.floor(Number(fee.amount) || 0);
  if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
    console.warn("[seedPaymentsForFee] skip invalid fee amount", { teamId, feeId: fee.id, feeAmount });
    return;
  }

  let batch = writeBatch(db);
  let ops = 0;

  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  for (const memberDoc of membersSnap.docs) {
    const data = memberDoc.data() as Record<string, unknown>;
    if (data.isDeleted === true) continue;
    if (String(data.status || "active") !== "active") continue;

    const userId = getMemberBillingUid(data as { userId?: unknown; uid?: unknown }, memberDoc.id);
    const duesType: MemberDuesType = normalizeMemberDuesType(data.duesType ?? data.feePlan);
    const discountAmountRaw =
      typeof data.discountAmount === "number" && Number.isFinite(data.discountAmount)
        ? Math.floor(data.discountAmount)
        : NaN;
    const discountAmount = Number.isFinite(discountAmountRaw) && discountAmountRaw > 0 ? discountAmountRaw : null;

    let status: "pending" | "paid" = "pending";
    let amount = feeAmount;

    if (duesType === "exempt") {
      status = "paid";
      /** 당월 수납 현금 0 — onFeePaidCashBookEntry 는 amount>0 일 때만 cashBook 수입 생성 */
      amount = 0;
    } else if (duesType === "discount") {
      status = "pending";
      amount = discountAmount ?? feeAmount;
    } else if (duesType === "yearly") {
      if (yearlyDuesCoversFeeCalendarYear(data.yearlyPaidAt ?? data.annualPaidAt, feeDueYear)) {
        status = "paid";
        /** 연납으로 해당 연도 회비 이미 반영 → 수납액 0, cashBook 미기록이 정상 */
        amount = 0;
      } else {
        status = "pending";
        amount = feeAmount;
      }
    }

    const name =
      (typeof data.name === "string" && data.name.trim()) ||
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      "";

    const paymentId = buildTeamFeePaymentDocId(fee.id, userId);
    const ref = doc(db, "teams", teamId, "payments", paymentId);

    const amountDue = amount;
    const amountPaid = status === "paid" ? amount : 0;

    const payload: Record<string, unknown> = {
      teamId,
      feeId: fee.id,
      userId,
      duesType,
      amount,
      amountDue,
      amountPaid,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (duesType === "discount" && discountAmount != null) payload.discountAmount = discountAmount;
    if (typeof data.discountLabel === "string" && data.discountLabel.trim()) {
      payload.discountLabel = data.discountLabel.trim();
    }
    if (name) payload.memberName = name;

    batch.set(ref, payload, { merge: true });
    ops++;
    if (ops >= MAX_BATCH) await flush();
  }

  await flush();
}
