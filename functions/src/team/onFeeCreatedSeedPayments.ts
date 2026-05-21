/**
 * 회비(fee) 문서 생성 시 활성 멤버별 `teams/{teamId}/payments/{feeId}_{userId}` 자동 시드.
 * 클라 `seedPaymentsForFee`와 동일 규칙·멱등(merge) — 콘솔/백오피스로 fee만 넣은 경우에도 복구됨.
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { buildTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const MAX_BATCH = 400;

type MemberDuesType = "monthly" | "yearly" | "exempt";

function normalizeMemberDuesType(raw: unknown): MemberDuesType {
  if (raw === "yearly" || raw === "annual") return "yearly";
  if (raw === "exempt") return "exempt";
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

function yearlyDuesCoversFeeCalendarYear(
  yearlyPaidAt: unknown,
  feeDueYear: number
): boolean {
  const d = toJsDate(yearlyPaidAt);
  if (!d || !Number.isFinite(feeDueYear)) return false;
  return d.getFullYear() === feeDueYear;
}

export const onFeeCreatedSeedTeamPayments = onDocumentCreated(
  {
    document: "teams/{teamId}/fees/{feeId}",
    region: "asia-northeast3",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (event) => {
    const teamId = String(event.params.teamId || "");
    const feeId = String(event.params.feeId || "");
    logger.info("FUNCTION START", { fn: "onFeeCreatedSeedTeamPayments", teamId, feeId });

    const snap = event.data;
    if (!snap?.exists) {
      logger.warn("onFeeCreatedSeedTeamPayments: no snapshot data", { teamId, feeId });
      return;
    }

    const fee = snap.data() as Record<string, unknown>;
    const feeAmount = Math.floor(Number(fee.amount) || 0);
    const statusRaw = String(fee.status ?? "open").trim().toLowerCase();
    if (statusRaw === "closed") {
      logger.info("onFeeCreatedSeedTeamPayments: skip closed fee", { teamId, feeId });
      return;
    }
    if (feeAmount < 1) {
      logger.warn("onFeeCreatedSeedTeamPayments: skip zero amount", { teamId, feeId, feeAmount });
      return;
    }

    const dueTs = fee.dueDate as admin.firestore.Timestamp | undefined;
    const due = dueTs?.toDate?.() instanceof Date ? dueTs.toDate() : new Date();
    const feeDueYear = due.getFullYear();

    logger.info("DATA", {
      teamId,
      feeId,
      amount: feeAmount,
      status: statusRaw,
      feeDueYear,
    });

    const membersSnap = await db.collection("teams").doc(teamId).collection("members").get();
    let batch = db.batch();
    let ops = 0;

    const flush = async () => {
      if (ops > 0) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    for (const memberDoc of membersSnap.docs) {
      const data = memberDoc.data() as Record<string, unknown>;
      if (data.isDeleted === true) continue;
      if (String(data.status || "active") !== "active") continue;

      const authUid =
        (typeof data.userId === "string" && data.userId.trim()) ||
        (typeof data.uid === "string" && data.uid.trim()) ||
        "";
      const userId = authUid || memberDoc.id;
      const duesType = normalizeMemberDuesType(data.duesType ?? data.feePlan);

      let status: "pending" | "paid" = "pending";
      let amount = feeAmount;

      if (duesType === "exempt") {
        status = "paid";
        amount = 0;
      } else if (duesType === "yearly") {
        if (yearlyDuesCoversFeeCalendarYear(data.yearlyPaidAt ?? data.annualPaidAt, feeDueYear)) {
          status = "paid";
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

      const paymentId = buildTeamFeePaymentDocId(feeId, userId);
      const ref = db.collection("teams").doc(teamId).collection("payments").doc(paymentId);

      const amountDue = amount;
      const amountPaid = status === "paid" ? amount : 0;

      const payload: Record<string, unknown> = {
        teamId,
        feeId,
        userId,
        duesType,
        amount,
        amountDue,
        amountPaid,
        status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (name) payload.memberName = name;

      batch.set(ref, payload, { merge: true });
      ops++;
      if (ops >= MAX_BATCH) await flush();
    }

    await flush();
    logger.info("onFeeCreatedSeedTeamPayments: committed", {
      teamId,
      feeId,
      memberCount: membersSnap.size,
      batchesApprox: Math.ceil(membersSnap.size / MAX_BATCH) || 0,
    });
  }
);
