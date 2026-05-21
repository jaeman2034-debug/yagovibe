/**
 * 마켓 거래 완료 — 판매자만, market + 판매자 XP/soldCount + ledger 멱등
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { applyXpDeltaInTransaction } from "../game/xpApplyCore";
import { assertCanCompleteMarketTransaction } from "./completeMarketBuyerGuard";
import { getMarketTransactionXpReward } from "./marketXpPolicy";

const REGION = "asia-northeast3";

const ALLOWED_PRE_STATUS = new Set(["reserved", "active", "open"]);

export type CompleteMarketTransactionRequest = {
  postId: string;
  /** 클라 캐시와 서버 `reservedBy` 교차검증용 (예약 거래 시 권장) */
  buyerId?: string | null;
};

export type CompleteMarketTransactionResponse = {
  ok: boolean;
  alreadyComplete: boolean;
  sellerId: string;
};

export const completeMarketTransaction = onCall(
  { region: REGION, cors: true, maxInstances: 30 },
  async (request): Promise<CompleteMarketTransactionResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const body = request.data as Partial<CompleteMarketTransactionRequest>;
    const postId = typeof body.postId === "string" ? body.postId.trim() : "";
    if (!postId) {
      throw new HttpsError("invalid-argument", "postId가 필요합니다.");
    }

    const optionalBuyerId =
      typeof body.buyerId === "string" && body.buyerId.trim().length > 0 ? body.buyerId.trim() : null;

    const db = getFirestore();
    const marketRef = db.doc(`market/${postId}`);
    const preSnap = await marketRef.get();
    if (!preSnap.exists) {
      throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
    }
    const pre = preSnap.data() ?? {};
    const authorId =
      typeof pre.authorId === "string"
        ? pre.authorId
        : typeof pre.userId === "string"
          ? pre.userId
          : "";
    if (!authorId) {
      throw new HttpsError("failed-precondition", "게시글에 판매자 정보가 없습니다.");
    }
    if (authorId !== uid) {
      throw new HttpsError("permission-denied", "판매자만 거래를 완료할 수 있습니다.");
    }

    assertCanCompleteMarketTransaction(pre, optionalBuyerId);

    const preStatus = typeof pre.status === "string" ? pre.status : "";
    if (preStatus === "completed" || preStatus === "done") {
      return { ok: true, alreadyComplete: true, sellerId: authorId };
    }
    if (!ALLOWED_PRE_STATUS.has(preStatus)) {
      throw new HttpsError("failed-precondition", "이 상태에서는 거래를 완료할 수 없습니다.");
    }

    const ledgerRef = db.doc(`users/${authorId}/gameLedger/marketComplete_${postId}`);

    try {
      const outcome = await db.runTransaction(async (tx) => {
        const marketSnap = await tx.get(marketRef);
        if (!marketSnap.exists) {
          throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
        }
        const m = marketSnap.data() ?? {};
        const sid =
          typeof m.authorId === "string"
            ? m.authorId
            : typeof m.userId === "string"
              ? m.userId
              : "";
        if (sid !== uid) {
          throw new HttpsError("permission-denied", "판매자만 거래를 완료할 수 있습니다.");
        }

        assertCanCompleteMarketTransaction(m, optionalBuyerId);

        const st = typeof m.status === "string" ? m.status : "";
        if (st === "completed" || st === "done") {
          return "already_complete" as const;
        }
        if (!ALLOWED_PRE_STATUS.has(st)) {
          throw new HttpsError("failed-precondition", "이 상태에서는 거래를 완료할 수 없습니다.");
        }

        const xpReward = getMarketTransactionXpReward(m);

        const ledgerSnap = await tx.get(ledgerRef);
        const marketPostsRef = db.doc(`marketPosts/${postId}`);
        const mpSnap = await tx.get(marketPostsRef);

        const grantRewards = !ledgerSnap.exists;

        let marketXpApplied = 0;
        let marketXpRequested = 0;

        if (grantRewards) {
          if (xpReward > 0) {
            const xpApply = await applyXpDeltaInTransaction(db, tx, authorId, xpReward, "marketComplete", {});
            marketXpApplied = xpApply.xpApplied;
            marketXpRequested = xpApply.xpRequested;
          }
          const sellerRef = db.doc(`users/${authorId}`);
          tx.set(
            sellerRef,
            {
              soldCount: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        const completedPatch: Record<string, unknown> = {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          sellerId: authorId,
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.set(marketRef, completedPatch, { merge: true });

        if (mpSnap.exists) {
          tx.set(marketPostsRef, completedPatch, { merge: true });
        }

        if (grantRewards) {
          tx.set(
            ledgerRef,
            {
              schemaVersion: 1,
              source: "marketTransactionComplete",
              postId,
              deltaXp: marketXpApplied,
              payload: {
                xpRequested: xpReward,
                xpCapped: xpReward > 0 && marketXpApplied < marketXpRequested,
              },
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        return "applied" as const;
      });

      return {
        ok: true,
        alreadyComplete: outcome === "already_complete",
        sellerId: authorId,
      };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      logger.error("completeMarketTransaction failed", e);
      throw new HttpsError("internal", "거래 완료 처리에 실패했습니다.");
    }
  }
);
