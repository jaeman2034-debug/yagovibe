import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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
 * 좋아요·댓글·신뢰·리스크 등 변경 시 `hubScore` 재계산 (무한 루프 방지: 값 동일 시 스킵)
 */
export const activityHubScoreOnWrite = onDocumentWritten("activities/{activityId}", async (event) => {
  const afterSnap = event.data?.after;
  if (!afterSnap?.exists) return;

  const d = afterSnap.data() as Record<string, unknown>;

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

  const readN = (k: string): number | undefined => {
    const v = d[k];
    return typeof v === "number" && Number.isFinite(v) ? (v as number) : undefined;
  };

  const next = computeActivityHubScoreStoredFn({
    createdAtMillis: ms,
    likeCount: likes,
    commentCount: comments,
    authorTrustScore: trust,
    riskScore: risk,
    feedbackReportCount: readN("feedbackReportCount"),
    feedbackHideCount: readN("feedbackHideCount"),
    feedbackNotInterestedCount: readN("feedbackNotInterestedCount"),
  });

  const prev = typeof d.hubScore === "number" && Number.isFinite(d.hubScore) ? (d.hubScore as number) : null;
  if (prev !== null && Math.abs(prev - next) < 0.05) {
    return;
  }

  try {
    await afterSnap.ref.update({
      hubScore: next,
      hubScoreUpdatedAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.warn("[activityHubScoreOnWrite] update 실패", { activityId: event.params.activityId, err: String(e) });
  }
});
