import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { calcUserRiskScoreAdmin, getUserRiskTier } from "./riskScoringAdmin";
import { DEFAULT_RISK_RULES } from "./riskRulesStatic";

export async function recomputeUserRiskSnapshot(db: Firestore, userId: string): Promise<void> {
  const { score, flags, tier } = await calcUserRiskScoreAdmin(db, userId);
  const ref = db.doc(`users/${userId}`);
  await ref.set(
    {
      riskScore: score,
      riskFlags: flags,
      riskTier: tier,
      lastRiskUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function decreaseUserRiskScore(db: Firestore, userId: string, delta: number): Promise<void> {
  const ref = db.doc(`users/${userId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const cur = Number(snap.data()?.riskScore ?? 0) || 0;
    const next = Math.max(0, cur - delta);
    const tier = getUserRiskTier(next, DEFAULT_RISK_RULES);
    tx.set(
      ref,
      {
        riskScore: next,
        riskTier: tier,
        lastRiskUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function recomputeUserRiskSnapshotById(userId: string): Promise<void> {
  await recomputeUserRiskSnapshot(getFirestore(), userId);
}

export async function decreaseUserRiskScoreById(userId: string, delta: number): Promise<void> {
  await decreaseUserRiskScore(getFirestore(), userId, delta);
}
