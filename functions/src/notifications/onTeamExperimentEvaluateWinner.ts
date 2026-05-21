/**
 * 실험 집계가 갱신될 때 샘플 수·전환율 차이를 보고 승자 확정 → 이후 알림은 winner_only 로 고정 배분.
 */
import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const TRACKED = new Set(["billing_reregister_v1", "fee_reminder_v1"]);
const MIN_TOTAL_SENT = 100;
/** 전환율 차이(비율 단위): 0.1 = 10%p */
const MIN_RATE_DIFF = 0.1;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bucket(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function primaryRates(
  experimentId: string,
  va: Record<string, unknown>,
  vb: Record<string, unknown>
): { rateA: number; rateB: number } {
  const aClick = num(va.clicked);
  const bClick = num(vb.clicked);
  if (experimentId === "billing_reregister_v1") {
    return {
      rateA: aClick > 0 ? num(va.reRegisterConverted) / aClick : 0,
      rateB: bClick > 0 ? num(vb.reRegisterConverted) / bClick : 0,
    };
  }
  return {
    rateA: aClick > 0 ? num(va.converted) / aClick : 0,
    rateB: bClick > 0 ? num(vb.converted) / bClick : 0,
  };
}

export const onTeamExperimentEvaluateWinner = onDocumentWritten(
  {
    document: "teams/{teamId}/experiments/{experimentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const experimentId = event.params.experimentId as string;
    const teamId = event.params.teamId as string;
    if (!TRACKED.has(experimentId)) return;

    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;

    const ref = afterSnap.ref;

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const d = snap.data() as Record<string, unknown>;
        if (d.decidedAt) return;

        const va = bucket(d.variantA);
        const vb = bucket(d.variantB);
        const totalSent = num(va.sent) + num(vb.sent);
        if (totalSent < MIN_TOTAL_SENT) return;

        const { rateA, rateB } = primaryRates(experimentId, va, vb);
        const diff = Math.abs(rateA - rateB);
        if (diff < MIN_RATE_DIFF) return;

        const winner: "A" | "B" = rateA > rateB ? "A" : "B";
        tx.update(ref, {
          winner,
          decidedAt: admin.firestore.FieldValue.serverTimestamp(),
          rollout: "winner_only",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (e) {
      logger.warn("[onTeamExperimentEvaluateWinner] 스킵/실패", {
        teamId,
        experimentId,
        error: String(e),
      });
    }
  }
);
