import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { FirestoreEvent } from "firebase-functions/v2/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/**
 * 협회 회비 납부(teamFeePayments) 생성 시 본문 — index.ts 에서 동적 import 로만 로드 (배포 타임아웃 완화)
 */
export async function runOnTeamFeePaymentCreate(
  event: FirestoreEvent<DocumentSnapshot | undefined, { fedId: string; paymentId: string }>
): Promise<void> {
  const snap = event.data;
  if (!snap?.exists) return;

  const { fedId, paymentId } = event.params;
  const d = snap.data();

  const amount = typeof d.amount === "number" ? Math.floor(d.amount) : 0;
  if (amount <= 0) {
    console.warn("[onFederationTeamFeePaymentCreate] skip invalid amount", { fedId, paymentId });
    return;
  }

  const teamId = String(d.teamId || "").trim();
  const year = typeof d.year === "number" ? d.year : parseInt(String(d.year), 10);
  if (!teamId || !Number.isFinite(year)) {
    console.warn("[onFederationTeamFeePaymentCreate] skip missing teamId/year", { fedId, paymentId });
    return;
  }

  const paidAt = typeof d.paidAt === "string" && d.paidAt.trim() ? d.paidAt.trim() : new Date().toISOString();
  const createdByUid = String(d.createdByUid || "").trim();
  if (!createdByUid) {
    console.warn("[onFederationTeamFeePaymentCreate] skip missing createdByUid", { fedId, paymentId });
    return;
  }

  const memo = d.memo != null ? String(d.memo).trim() : "";

  const db = getFirestore();
  const txId = `teamFee_${paymentId}`;
  const txRef = db.doc(`federations/${fedId}/transactions/${txId}`);
  const accountId = `${teamId}_${year}`;
  const accRef = db.doc(`federations/${fedId}/teamFeeAccounts/${accountId}`);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists) {
      return;
    }

    t.set(txRef, {
      type: "income",
      domain: "team_fee",
      ledgerDomain: "general",
      category: "team_fee_payment",
      amount,
      occurredAt: paidAt,
      relatedRef: { kind: "fee_payment", id: paymentId },
      memo: memo || null,
      createdByUid,
      createdAt: FieldValue.serverTimestamp(),
    });

    const accSnap = await t.get(accRef);
    if (!accSnap.exists) {
      console.warn("[onFederationTeamFeePaymentCreate] teamFeeAccount missing; transaction only", {
        fedId,
        accountId,
      });
      return;
    }

    const ad = accSnap.data() || {};
    const billed = typeof ad.billedAmount === "number" ? ad.billedAmount : 0;
    const prevPaid = typeof ad.paidAmount === "number" ? ad.paidAmount : 0;
    const nextPaid = prevPaid + amount;

    let status = "partial";
    if (billed <= 0) {
      status = nextPaid <= 0 ? "unpaid" : "paid";
    } else if (nextPaid >= billed) {
      status = "paid";
    } else if (nextPaid <= 0) {
      status = "unpaid";
    }

    t.update(accRef, {
      paidAmount: nextPaid,
      status,
    });
  });
}
