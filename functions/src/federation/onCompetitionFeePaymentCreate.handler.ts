import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { FirestoreEvent } from "firebase-functions/v2/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/**
 * 대회 참가비 납부 본문 — index.ts 에서 동적 import 로만 로드
 */
export async function runOnCompetitionFeePaymentCreate(
  event: FirestoreEvent<DocumentSnapshot | undefined, { fedId: string; paymentId: string }>
): Promise<void> {
  const snap = event.data;
  if (!snap?.exists) return;

  const { fedId, paymentId } = event.params;
  const d = snap.data();

  const amount = typeof d.amount === "number" ? Math.floor(d.amount) : 0;
  if (amount <= 0) {
    console.warn("[onFederationCompetitionFeePaymentCreate] skip invalid amount", { fedId, paymentId });
    return;
  }

  const entryId = String(d.entryId || "").trim();
  const competitionId = String(d.competitionId || "").trim();
  const teamId = String(d.teamId || "").trim();
  if (!entryId || !competitionId || !teamId) {
    console.warn("[onFederationCompetitionFeePaymentCreate] skip missing ids", { fedId, paymentId });
    return;
  }

  const paidAt = typeof d.paidAt === "string" && d.paidAt.trim() ? d.paidAt.trim() : new Date().toISOString();
  const createdByUid = String(d.createdByUid || "").trim();
  if (!createdByUid) {
    console.warn("[onFederationCompetitionFeePaymentCreate] skip missing createdByUid", { fedId, paymentId });
    return;
  }

  const memo = d.memo != null ? String(d.memo).trim() : "";

  const db = getFirestore();
  const txId = `competitionFee_${paymentId}`;
  const txRef = db.doc(`federations/${fedId}/transactions/${txId}`);
  const entryRef = db.doc(`federations/${fedId}/competitionEntries/${entryId}`);
  const teamRef = db.doc(`federations/${fedId}/teams/${teamId}`);

  await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (txSnap.exists) {
      return;
    }

    const entrySnap = await t.get(entryRef);
    if (!entrySnap.exists) {
      console.warn("[onFederationCompetitionFeePaymentCreate] entry missing; skip ledger+entry", {
        fedId,
        entryId,
      });
      return;
    }

    const ed = entrySnap.data() || {};
    if (String(ed.competitionId || "") !== competitionId || String(ed.teamId || "") !== teamId) {
      console.warn("[onFederationCompetitionFeePaymentCreate] entry mismatch", { fedId, entryId });
      return;
    }

    const teamSnap = await t.get(teamRef);
    const teamData = (teamSnap.exists ? teamSnap.data() : {}) as Record<string, unknown>;
    const applicationId = typeof teamData.applicationId === "string" ? teamData.applicationId.trim() : "";
    const expectedTxId = applicationId ? `competition_expected_${competitionId}_${applicationId}` : "";
    const expectedTxRef = expectedTxId ? db.doc(`federations/${fedId}/transactions/${expectedTxId}`) : null;

    t.set(txRef, {
      type: "income",
      domain: "competition",
      ledgerDomain: "general",
      category: "competition_fee",
      amount,
      occurredAt: paidAt,
      relatedRef: { kind: "competition_entry", id: entryId },
      sourceType: "competition_fee_payment",
      sourceId: paymentId,
      incomeStatus: "paid",
      incomeSourceType: "competition_fee",
      teamId,
      leagueId: competitionId,
      competitionId,
      ...(expectedTxId ? { appliedToTxId: expectedTxId } : {}),
      memo: memo || null,
      createdByUid,
      createdAt: FieldValue.serverTimestamp(),
    });

    const total = typeof ed.totalFeeAmount === "number" ? ed.totalFeeAmount : 0;
    const prevPaid = typeof ed.paidAmount === "number" ? ed.paidAmount : 0;
    const nextPaid = prevPaid + amount;

    let status = "partial";
    if (total <= 0) {
      status = nextPaid <= 0 ? "unpaid" : "paid";
    } else if (nextPaid >= total) {
      status = "paid";
    } else if (nextPaid <= 0) {
      status = "unpaid";
    }

    t.update(entryRef, {
      paidAmount: nextPaid,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (expectedTxRef) {
      const expectedSnap = await t.get(expectedTxRef);
      if (expectedSnap.exists) {
        const xd = expectedSnap.data() as Record<string, unknown>;
        const expectedAmount = typeof xd.amount === "number" ? Math.max(0, Math.floor(xd.amount)) : 0;
        const prevExpectedPaid = typeof xd.paidAmount === "number" ? Math.max(0, Math.floor(xd.paidAmount)) : 0;
        const nextExpectedPaid = prevExpectedPaid + amount;
        const remainingAmount = expectedAmount - nextExpectedPaid;
        const nextIncomeStatus =
          nextExpectedPaid <= 0
            ? "expected"
            : nextExpectedPaid < expectedAmount
              ? "partial"
              : nextExpectedPaid === expectedAmount
                ? "paid"
                : "overpaid";
        t.update(expectedTxRef, {
          paidAmount: nextExpectedPaid,
          remainingAmount,
          incomeStatus: nextIncomeStatus,
          ...(nextIncomeStatus === "paid" ? { occurredAt: paidAt, paidAt } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  });
}
