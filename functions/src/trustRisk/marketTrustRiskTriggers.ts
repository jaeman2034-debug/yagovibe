/**
 * market / marketReviews 이벤트 → users·게시글 리스크 서버 갱신 (클라 직접 패치 제거)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}
import { logger } from "firebase-functions";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { applyPostRiskForMarketDoc } from "./applyPostRiskAdmin";
import { recomputeSellerTrustSnapshot } from "./sellerTrustRecompute";
import { decreaseUserRiskScore, recomputeUserRiskSnapshot } from "./userRiskWriteAdmin";

const REGION = "asia-northeast3";

export const onMarketReviewCreatedTrustRisk = onDocumentCreated(
  { document: "marketReviews/{reviewId}", region: REGION },
  async (event) => {
    const data = event.data?.data();
    const sellerId = data?.sellerId;
    if (typeof sellerId !== "string" || !sellerId) return;

    const db = getFirestore();
    try {
      await recomputeSellerTrustSnapshot(db, sellerId);
      await decreaseUserRiskScore(db, sellerId, 5);
    } catch (e) {
      logger.error("onMarketReviewCreatedTrustRisk failed", e);
    }
  }
);

export const onMarketWriteTrustRisk = onDocumentWritten(
  { document: "market/{postId}", region: REGION },
  async (event) => {
    const postId = event.params.postId as string;
    const change = event.data;
    if (!change) return;

    const afterSnap = change.after;
    if (!afterSnap.exists) return;

    const after = afterSnap.data();
    if (!after) return;

    const db = getFirestore();
    const beforeExists = change.before.exists;
    const before = beforeExists ? change.before.data() : undefined;

    try {
      if (!beforeExists) {
        await applyPostRiskForMarketDoc(db, postId);
        const authorId =
          typeof after.authorId === "string"
            ? after.authorId
            : typeof after.userId === "string"
              ? after.userId
              : "";
        if (authorId) {
          await recomputeUserRiskSnapshot(db, authorId);
          await recomputeSellerTrustSnapshot(db, authorId);
        }
        return;
      }

      const prevStatus = before?.status;
      const nextStatus = after.status;
      const becameCompleted =
        (nextStatus === "completed" || nextStatus === "done") &&
        prevStatus !== "completed" &&
        prevStatus !== "done";

      if (becameCompleted) {
        const authorId =
          typeof after.authorId === "string"
            ? after.authorId
            : typeof after.userId === "string"
              ? after.userId
              : "";
        if (authorId) {
          await recomputeSellerTrustSnapshot(db, authorId);
          await decreaseUserRiskScore(db, authorId, 3);
        }
      }
    } catch (e) {
      logger.error("onMarketWriteTrustRisk failed", { postId, err: e });
    }
  }
);
