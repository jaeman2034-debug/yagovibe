/**
 * cashBook 원장 합계 ↔ cashBookSummary/default.balance 정합 (스케줄·Callable 공용)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import * as admin from "firebase-admin";
import { getFirestore, FieldPath } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const PAGE = 400;

export async function sumCashBookForTeam(teamId: string): Promise<{ ledger: number; txCount: number }> {
  const col = db.collection(`teams/${teamId}/cashBook`);
  let ledger = 0;
  let txCount = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let q = col.orderBy(FieldPath.documentId()).limit(PAGE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      const x = d.data() as Record<string, unknown>;
      if (x.isDeleted === true) continue;
      const kind = x.kind;
      const amt = Math.floor(Number(x.amount) || 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      if (kind === "income") ledger += amt;
      else if (kind === "expense") ledger -= amt;
      txCount += 1;
    }

    if (snap.size < PAGE) break;
    last = snap.docs[snap.docs.length - 1];
  }

  return { ledger, txCount };
}

export type ReconcileCashBookMode = "scheduled" | "manual";

export type ReconcileCashBookSummaryForTeamResult = {
  ledger: number;
  stored: number;
  delta: number;
  txCount: number;
  /** Firestore 요약 문서에 쓰기 여부 */
  summaryWritten: boolean;
};

/**
 * @param mode scheduled — delta==0 이면 쓰기 생략(비용). manual — 항상 reconciledAt 등 갱신(CS·즉시 검증).
 */
export async function reconcileCashBookSummaryForTeam(
  teamId: string,
  mode: ReconcileCashBookMode
): Promise<ReconcileCashBookSummaryForTeamResult> {
  const tid = String(teamId || "").trim();
  if (!tid) {
    throw new Error("MISSING_TEAM_ID");
  }

  const { ledger, txCount } = await sumCashBookForTeam(tid);
  const summaryRef = db.doc(`teams/${tid}/cashBookSummary/default`);
  const sumSnap = await summaryRef.get();
  const stored = sumSnap.exists ? Math.round(Number((sumSnap.data() as Record<string, unknown>)?.balance ?? 0)) : 0;
  const delta = ledger - stored;

  if (mode === "scheduled" && delta === 0) {
    return { ledger, stored, delta, txCount, summaryWritten: false };
  }

  const patch: Record<string, unknown> = {
    reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
    lastReconciledDelta: delta,
    lastReconciledTxCount: txCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!sumSnap.exists || delta !== 0) {
    patch.balance = ledger;
  }

  await summaryRef.set(patch, { merge: true });
  return { ledger, stored, delta, txCount, summaryWritten: true };
}
