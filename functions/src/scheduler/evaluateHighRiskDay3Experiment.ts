/**
 * High Risk Day3 A/B 실험 자동 판정:
 * - 표본수 A/B sent 각각 100 이상
 * - uplift(B vs A) 15% 이상 + B_rate > A_rate
 * 충족 시 winner를 저장하고 rollout=full 로 전환.
 */
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const EXPERIMENT_ID = "high_risk_day3_v1";
const MIN_SAMPLE_PER_VARIANT = 100;
const MIN_UPLIFT = 0.15;

function n(v: unknown): number {
  const x = Math.floor(Number(v ?? 0));
  return Number.isFinite(x) && x > 0 ? x : 0;
}

export const evaluateHighRiskDay3Experiment = onSchedule(
  {
    schedule: "5 1 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    const snap = await db.collectionGroup("experiments").where("experimentId", "==", EXPERIMENT_ID).get();

    let aSent = 0;
    let aReactivated = 0;
    let bSent = 0;
    let bReactivated = 0;
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const va = (data.variantA as Record<string, unknown> | undefined) || {};
      const vb = (data.variantB as Record<string, unknown> | undefined) || {};
      aSent += n(va.sent);
      aReactivated += n(va.reactivated);
      bSent += n(vb.sent);
      bReactivated += n(vb.reactivated);
    }

    const aRate = aSent > 0 ? aReactivated / aSent : 0;
    const bRate = bSent > 0 ? bReactivated / bSent : 0;
    const uplift = aRate > 0 ? (bRate - aRate) / aRate : 0;
    const enoughSample = aSent >= MIN_SAMPLE_PER_VARIANT && bSent >= MIN_SAMPLE_PER_VARIANT;
    const bWins = enoughSample && aRate > 0 && bRate > aRate && uplift >= MIN_UPLIFT;

    const decisionRef = db.doc(`experimentDecisions/${EXPERIMENT_ID}`);
    const patch: Record<string, unknown> = {
      experimentId: EXPERIMENT_ID,
      status: bWins ? "decided" : "running",
      winner: bWins ? "B" : FieldValue.delete(),
      rollout: bWins ? "full" : "ab",
      uplift,
      rates: { A: aRate, B: bRate },
      sampleSize: { A: aSent, B: bSent },
      rule: {
        minSamplePerVariant: MIN_SAMPLE_PER_VARIANT,
        minUplift: MIN_UPLIFT,
      },
      evaluatedAt: FieldValue.serverTimestamp(),
      decidedAt: bWins ? FieldValue.serverTimestamp() : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await decisionRef.set(patch, { merge: true });

    logger.info("[evaluateHighRiskDay3Experiment] evaluated", {
      aSent,
      bSent,
      aRate,
      bRate,
      uplift,
      bWins,
    });
  }
);

