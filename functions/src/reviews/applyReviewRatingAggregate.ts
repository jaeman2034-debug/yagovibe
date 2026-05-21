/**
 * 채팅/거래 후기 작성 후 판매자(피평가자) 평점 집계 — 타인 users 문서 클라 수정 제거
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";
const db = getFirestore();

export type ApplyReviewRatingAggregateRequest = {
  reviewId: string;
};

export type ApplyReviewRatingAggregateResponse = {
  ok: boolean;
  alreadyApplied?: boolean;
};

export const applyReviewRatingAggregate = onCall(
  { region: REGION, cors: true, maxInstances: 30 },
  async (request): Promise<ApplyReviewRatingAggregateResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const reviewIdRaw = (request.data as Partial<ApplyReviewRatingAggregateRequest>)?.reviewId;
    const reviewId = typeof reviewIdRaw === "string" ? reviewIdRaw.trim() : "";
    if (!reviewId) {
      throw new HttpsError("invalid-argument", "reviewId가 필요합니다.");
    }

    const reviewRef = db.doc(`reviews/${reviewId}`);
    const pre = await reviewRef.get();
    if (!pre.exists) {
      throw new HttpsError("not-found", "후기를 찾을 수 없습니다.");
    }

    const preData = pre.data() ?? {};
    const reviewerId = typeof preData.reviewerId === "string" ? preData.reviewerId : "";
    if (reviewerId !== uid) {
      throw new HttpsError("permission-denied", "본인이 작성한 후기만 집계할 수 있습니다.");
    }
    if (preData.profileRatingApplied === true) {
      return { ok: true, alreadyApplied: true };
    }

    const targetUserId = typeof preData.targetUserId === "string" ? preData.targetUserId.trim() : "";
    if (!targetUserId) {
      throw new HttpsError("failed-precondition", "후기에 대상 사용자가 없습니다.");
    }

    const rating = Number(preData.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new HttpsError("failed-precondition", "유효하지 않은 평점입니다.");
    }

    try {
      await db.runTransaction(async (tx) => {
        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) {
          return;
        }
        const r = reviewSnap.data() ?? {};
        if (r.profileRatingApplied === true) {
          return;
        }
        if (typeof r.reviewerId === "string" && r.reviewerId !== uid) {
          throw new Error("PERMISSION");
        }

        const userRef = db.doc(`users/${targetUserId}`);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
          throw new Error("NO_TARGET_USER");
        }

        const u = userSnap.data() ?? {};
        const prevCount = Number(u.reviewCount ?? 0);
        const prevAvg = Number(u.ratingAvg ?? 0);
        const newCount = prevCount + 1;
        const newAvg = (prevAvg * prevCount + rating) / newCount;

        tx.set(
          userRef,
          {
            reviewCount: newCount,
            ratingAvg: Number.isFinite(newAvg) ? Number(newAvg.toFixed(2)) : rating,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          reviewRef,
          {
            profileRatingApplied: true,
            profileRatingAppliedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return { ok: true, alreadyApplied: false };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_TARGET_USER") {
        throw new HttpsError("failed-precondition", "평가 대상 사용자 프로필이 없습니다.");
      }
      if (msg === "PERMISSION") {
        throw new HttpsError("permission-denied", "권한이 없습니다.");
      }
      logger.error("applyReviewRatingAggregate failed", e);
      throw new HttpsError("internal", "평점 반영에 실패했습니다.");
    }
  }
);
