import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Change, FirestoreEvent } from "firebase-functions/v2/firestore";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

function toSafeAmount(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * 신청 승인 시 expected 수입 원장을 자동 생성한다.
 * - 중복 방지: 고정 txId (competition_expected_{leagueId}_{applicationId})
 * - 금액 우선순위: application.expectedFeeAmount -> competitionEntries.totalFeeAmount -> league.entryFee
 */
export async function runOnApplicationApprovedCreateExpectedIncome(
  event: FirestoreEvent<
    Change<QueryDocumentSnapshot | undefined>,
    { fedId: string; leagueId: string; applicationId: string }
  >
): Promise<void> {
  const change = event.data;
  if (!change?.before?.exists || !change.after?.exists) return;

  const before = change.before.data() as Record<string, unknown>;
  const after = change.after.data() as Record<string, unknown>;
  if (String(before.status || "") === "approved") return;
  if (String(after.status || "") !== "approved") return;

  const { fedId, leagueId, applicationId } = event.params;
  const teamId = String(after.teamId || "").trim();
  const teamName = String(after.teamName || "").trim();
  if (!teamId) {
    console.warn("[onApplicationApprovedCreateExpectedIncome] skip missing teamId", {
      fedId,
      leagueId,
      applicationId,
    });
    return;
  }

  const db = getFirestore();
  const txId = `competition_expected_${leagueId}_${applicationId}`;
  const txRef = db.doc(`federations/${fedId}/transactions/${txId}`);
  const leagueRef = db.doc(`federations/${fedId}/leagues/${leagueId}`);
  const entryId = `${leagueId}__${teamId}`;
  const entryRef = db.doc(`federations/${fedId}/competitionEntries/${entryId}`);

  await db.runTransaction(async (t) => {
    const existing = await t.get(txRef);
    if (existing.exists) return;

    let amount = toSafeAmount(after.expectedFeeAmount);
    if (amount <= 0) {
      const entrySnap = await t.get(entryRef);
      if (entrySnap.exists) {
        const ed = entrySnap.data() as Record<string, unknown>;
        amount = toSafeAmount(ed.totalFeeAmount);
      }
    }
    if (amount <= 0) {
      const leagueSnap = await t.get(leagueRef);
      if (leagueSnap.exists) {
        const ld = leagueSnap.data() as Record<string, unknown>;
        amount = toSafeAmount(ld.entryFee);
      }
    }
    if (amount <= 0) {
      console.warn("[onApplicationApprovedCreateExpectedIncome] skip amount unresolved", {
        fedId,
        leagueId,
        applicationId,
        teamId,
      });
      return;
    }

    t.set(txRef, {
      type: "income",
      domain: "competition",
      ledgerDomain: "general",
      category: "competition_fee",
      amount,
      paidAmount: 0,
      remainingAmount: amount,
      incomeStatus: "expected",
      incomeSourceType: "competition_fee",
      manualIncome: false,
      expectedAt: new Date().toISOString(),
      occurredAt: null,
      payerType: "team",
      payerName: teamName || null,
      teamId,
      leagueId,
      competitionId: leagueId,
      relatedRef: { kind: "application", id: applicationId },
      sourceType: "competition_application",
      sourceId: applicationId,
      createdByType: "system",
      generationSource: "application_approval",
      createdByUid: String(after.approvedBy || "system:application_approval"),
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

