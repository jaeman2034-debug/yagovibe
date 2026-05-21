/**
 * 마켓 상품 후기 등 단순 XP 보너스 — 리뷰 문서 검증 + ledger 멱등
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { applyXpDeltaInTransaction } from "./xpApplyCore";
import { XP_POLICY } from "../config/xpPolicy";

const REGION = "asia-northeast3";
const db = getFirestore();

export type GrantUserXpBonusRequest = {
  source: "marketProductReview";
  productId: string;
  reviewId: string;
  /** 클라와 합의된 고정값 (검증용) */
  deltaXp?: number;
};

export type GrantUserXpBonusResponse = {
  ok: boolean;
  granted: boolean;
  totalXpApplied: number;
  totalXpRequested?: number;
  xpCapped?: boolean;
};

const EXPECTED_DELTA = XP_POLICY.REVIEW.MARKET_PRODUCT_DELTA;

export const grantUserXpBonus = onCall(
  { region: REGION, cors: true, maxInstances: 30 },
  async (request): Promise<GrantUserXpBonusResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const data = request.data as Partial<GrantUserXpBonusRequest>;
    if (data.source !== "marketProductReview") {
      throw new HttpsError("invalid-argument", "지원하지 않는 source 입니다.");
    }

    const productId = typeof data.productId === "string" ? data.productId.trim() : "";
    const reviewId = typeof data.reviewId === "string" ? data.reviewId.trim() : "";
    if (!productId || !reviewId) {
      throw new HttpsError("invalid-argument", "productId와 reviewId가 필요합니다.");
    }

    const deltaXp = Math.max(0, Math.floor(Number(data.deltaXp ?? EXPECTED_DELTA) || 0));
    if (deltaXp !== EXPECTED_DELTA) {
      throw new HttpsError("invalid-argument", "허용되지 않은 XP 값입니다.");
    }

    const reviewRef = db.doc(`marketProducts/${productId}/reviews/${reviewId}`);
    const ledgerRef = db.doc(`users/${uid}/gameLedger/marketReview_${productId}_${reviewId}`);

    try {
      const result = await db.runTransaction(async (tx) => {
        const ledgerSnap = await tx.get(ledgerRef);
        if (ledgerSnap.exists) {
          return { granted: false, totalXpApplied: 0 };
        }

        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) {
          throw new HttpsError("not-found", "후기를 찾을 수 없습니다.");
        }
        const rv = reviewSnap.data() ?? {};
        if (typeof rv.userId === "string" && rv.userId !== uid) {
          throw new HttpsError("permission-denied", "본인 후기만 XP가 적용됩니다.");
        }

        const xpApply = await applyXpDeltaInTransaction(db, tx, uid, deltaXp, "marketReview", {
          accuracyBump: Math.min(5, 1),
        });

        tx.set(
          ledgerRef,
          {
            schemaVersion: 1,
            source: "marketProductReview",
            deltaXp: xpApply.xpApplied,
            productId,
            reviewId,
            payload: {
              xpRequested: xpApply.xpRequested,
              xpCapped: xpApply.xpApplied < xpApply.xpRequested,
            },
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          granted: true,
          totalXpApplied: xpApply.xpApplied,
          totalXpRequested: xpApply.xpRequested,
          xpCapped: xpApply.xpApplied < xpApply.xpRequested,
        };
      });

      return {
        ok: true,
        granted: result.granted,
        totalXpApplied: result.totalXpApplied,
        totalXpRequested: result.totalXpRequested,
        xpCapped: result.xpCapped,
      };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      logger.error("grantUserXpBonus failed", e);
      throw new HttpsError("internal", "XP 지급에 실패했습니다.");
    }
  }
);
