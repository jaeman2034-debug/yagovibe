import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FEEDBACK_COL = "user_activity_feedback";

/**
 * 사용자 피드백 생성 시 `activities` 집계 필드 증가 → `activityHubScoreOnWrite`가 hubScore 재계산
 */
export const onUserActivityFeedbackCreate = onDocumentCreated(`${FEEDBACK_COL}/{feedbackId}`, async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data() as Record<string, unknown>;
  const activityId = typeof data.activityId === "string" ? data.activityId.trim() : "";
  const type = typeof data.type === "string" ? data.type.trim() : "";
  if (!activityId || !type) {
    logger.warn("[onUserActivityFeedbackCreate] activityId/type 없음", { feedbackId: event.params.feedbackId });
    return;
  }

  const db = getFirestore();
  const ref = db.collection("activities").doc(activityId);
  const inc = FieldValue.increment(1);
  const patch: Record<string, unknown> = {};

  if (type === "report") patch.feedbackReportCount = inc;
  else if (type === "hide") patch.feedbackHideCount = inc;
  else if (type === "not_interested") patch.feedbackNotInterestedCount = inc;
  else {
    logger.warn("[onUserActivityFeedbackCreate] 알 수 없는 type", { type, activityId });
    return;
  }

  try {
    await ref.update(patch);
  } catch (e) {
    logger.warn("[onUserActivityFeedbackCreate] activities 업데이트 실패", {
      activityId,
      err: String(e),
    });
  }
});

/**
 * 피드백 문서 삭제(실행 취소) 시 activities 집계 감소
 */
export const onUserActivityFeedbackDelete = onDocumentDeleted(`${FEEDBACK_COL}/{feedbackId}`, async (event) => {
  const oldSnap = event.data;
  if (!oldSnap) return;

  const data = oldSnap.data() as Record<string, unknown>;
  const activityId = typeof data.activityId === "string" ? data.activityId.trim() : "";
  const type = typeof data.type === "string" ? data.type.trim() : "";
  if (!activityId || !type) {
    logger.warn("[onUserActivityFeedbackDelete] activityId/type 없음", { feedbackId: event.params.feedbackId });
    return;
  }

  const db = getFirestore();
  const ref = db.collection("activities").doc(activityId);
  const dec = FieldValue.increment(-1);
  const patch: Record<string, unknown> = {};

  if (type === "report") patch.feedbackReportCount = dec;
  else if (type === "hide") patch.feedbackHideCount = dec;
  else if (type === "not_interested") patch.feedbackNotInterestedCount = dec;
  else {
    logger.warn("[onUserActivityFeedbackDelete] 알 수 없는 type", { type, activityId });
    return;
  }

  try {
    await ref.update(patch);
  } catch (e) {
    logger.warn("[onUserActivityFeedbackDelete] activities 업데이트 실패", {
      activityId,
      err: String(e),
    });
  }
});
