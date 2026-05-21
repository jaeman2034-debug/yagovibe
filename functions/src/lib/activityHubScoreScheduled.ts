import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { computeActivityHubScoreStoredFn } from "./activityHubScoreFormula";

function resolveCreatedAtMillis(d: Record<string, unknown>): number {
  if (typeof d.createdAtMillis === "number" && Number.isFinite(d.createdAtMillis)) {
    return d.createdAtMillis as number;
  }
  const ca = d.createdAt as Timestamp | undefined;
  if (ca instanceof Timestamp && typeof ca.toMillis === "function") {
    return ca.toMillis();
  }
  return Date.now();
}

/**
 * 시간 경과만으로도 hubScore가 갱신되도록 주기적 재계산 (최근 공개 activities 상한 N)
 */
export const activityHubScoreScheduledRefresh = onSchedule("every 60 minutes", async () => {
  const db = getFirestore();
  let processed = 0;
  let updated = 0;

  try {
    const snap = await db
      .collection("activities")
      .where("visibility", "==", "public")
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      processed++;
      const d = doc.data() as Record<string, unknown>;
      const ms = resolveCreatedAtMillis(d);
      const likes = typeof d.likeCount === "number" && Number.isFinite(d.likeCount) ? (d.likeCount as number) : 0;
      const comments =
        typeof d.commentCount === "number" && Number.isFinite(d.commentCount) ? (d.commentCount as number) : 0;
      const trust =
        typeof d.authorTrustScore === "number" && Number.isFinite(d.authorTrustScore)
          ? (d.authorTrustScore as number)
          : undefined;
      const risk =
        typeof d.riskScore === "number" && Number.isFinite(d.riskScore) ? (d.riskScore as number) : undefined;

      const next = computeActivityHubScoreStoredFn({
        createdAtMillis: ms,
        likeCount: likes,
        commentCount: comments,
        authorTrustScore: trust,
        riskScore: risk,
        feedbackReportCount: d.feedbackReportCount as number | undefined,
        feedbackHideCount: d.feedbackHideCount as number | undefined,
        feedbackNotInterestedCount: d.feedbackNotInterestedCount as number | undefined,
      });

      const prev = typeof d.hubScore === "number" && Number.isFinite(d.hubScore) ? (d.hubScore as number) : null;
      if (prev !== null && Math.abs(prev - next) < 0.05) {
        continue;
      }

      batch.update(doc.ref, {
        hubScore: next,
        hubScoreUpdatedAt: FieldValue.serverTimestamp(),
      });
      ops++;
      updated++;

      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    logger.info("[activityHubScoreScheduledRefresh] 완료", { processed, updated });
  } catch (e) {
    logger.error("[activityHubScoreScheduledRefresh] 실패", e);
  }
});
