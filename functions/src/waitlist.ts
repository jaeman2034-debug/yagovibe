/**
 * 🔥 대기열 자동 승격 시스템 (Waitlist Auto-Promotion)
 * 
 * 역할:
 * - approved 유저가 나가면 pending 중 가장 오래된 1명 자동 승인
 * - 트랜잭션으로 안전하게 처리
 * - 알림 발송 (트랜잭션 종료 후)
 * - currentPeople 보정
 * 
 * ✅ 정원/인원 정합성:
 * - 나간 사람이 approved면 `currentPeople - 1`
 * - 승격되면 `+1` 해서 결과적으로 동일
 * - pending 없으면 순수하게 -1
 * 
 * ✅ 트랜잭션 안에서는 데이터 변경만
 * ✅ 알림은 트랜잭션 종료 후 실행
 */

import { onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "./firebase";
import { notify } from "./notifications";

/**
 * approved 유저가 나간 경우 감지 (상태 변경)
 * 
 * 트리거: marketJoins/{joinId} 문서 업데이트
 * - approved → cancelled_by_user 감지
 */
export const onApprovedUserLeft = onDocumentUpdated(
  {
    document: "marketJoins/{joinId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const joinId = event.params.joinId as string;

    if (!before || !after) {
      logger.info("[onApprovedUserLeft] 데이터 없음:", { joinId });
      return;
    }

    // 🔥 approved → cancelled_by_user 감지
    if (before.status === "approved" && after.status === "cancelled_by_user") {
      const postId = after.postId;
      const userId = after.userId;

      logger.info("[onApprovedUserLeft] approved 유저 나감 감지:", {
        joinId,
        postId,
        userId,
      });

      await promoteNextPending(postId, userId);
    }
  }
);

/**
 * approved 유저가 나간 경우 감지 (삭제)
 * 
 * 트리거: marketJoins/{joinId} 문서 삭제
 * - approved 상태였던 문서 삭제 감지
 */
export const onApprovedUserDeleted = onDocumentDeleted(
  {
    document: "marketJoins/{joinId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.data();
    const joinId = event.params.joinId as string;

    if (!before) {
      logger.info("[onApprovedUserDeleted] 데이터 없음:", { joinId });
      return;
    }

    // 🔥 approved 상태였던 문서 삭제 감지
    if (before.status === "approved") {
      const postId = before.postId;
      const userId = before.userId;

      logger.info("[onApprovedUserDeleted] approved 유저 삭제 감지:", {
        joinId,
        postId,
        userId,
      });

      await promoteNextPending(postId, userId);
    }
  }
);

/**
 * 대기열 승격 로직 (트랜잭션 핵심)
 * 
 * @param postId - 게시글 ID
 * @param leftUserId - 나간 유저 ID (로깅용)
 */
async function promoteNextPending(postId: string, leftUserId: string): Promise<void> {
  logger.info("[promoteNextPending] 시작:", { postId, leftUserId });

  try {
    const result = await db.runTransaction(async (tx) => {
      const postRef = db.collection("market").doc(postId);
      const postSnap = await tx.get(postRef);
      const post = postSnap.data() as any;

      if (!post) {
        logger.warn("[promoteNextPending] 게시글 없음:", { postId });
        return { promotedUid: null as string | null, postTitle: null as string | null, chatRoomId: null as string | null };
      }

      const maxPeople = typeof post.people === "number" ? post.people : 0;
      const currentPeople = typeof post.currentPeople === "number" ? post.currentPeople : 0;

      // 1) 일단 한 명 나갔으니 -1
      let newCurrent = Math.max(0, currentPeople - 1);

      // 2) pending oldest 1명
      const pendingQuery = db
        .collection("marketJoins")
        .where("postId", "==", postId)
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .limit(1);

      const pendingSnap = await tx.get(pendingQuery);

      let promotedUid: string | null = null;

      if (!pendingSnap.empty) {
        const nextDoc = pendingSnap.docs[0];
        promotedUid = nextDoc.data().userId;

        // 승인 전환
        tx.update(nextDoc.ref, {
          status: "approved",
          updatedAt: FieldValue.serverTimestamp(),
          promotedAt: FieldValue.serverTimestamp(),
          promotedFrom: "waitlist",
        });

        // 승격되면 인원 +1
        newCurrent = newCurrent + 1;
      }

      const isFull = maxPeople > 0 ? newCurrent >= maxPeople : false;
      const status = isFull ? "full" : "open";

      tx.update(postRef, {
        currentPeople: newCurrent,
        status,
        ...(typeof post.isFull === "boolean" && { isFull }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        promotedUid,
        postTitle: post.title ?? "매칭",
        chatRoomId: promotedUid ? `${postId}_${promotedUid}_${post.authorId}` : null,
      };
    });

    // 🔥 트랜잭션 완료 후 알림 발송
    if (result?.promotedUid) {
      await notify(result.promotedUid, {
        type: "WAITLIST_PROMOTED",
        title: "대기 → 참여 확정",
        body: `"${result.postTitle}" 매칭 참여가 확정되었습니다. 채팅방이 열렸습니다.`,
        postId,
        chatRoomId: result.chatRoomId || undefined,
      });
      logger.info("WAITLIST_PROMOTED notified", {
        postId,
        promotedUid: result.promotedUid,
      });
    } else {
      logger.info("No pending user to promote", { postId, leftUid: leftUserId });
    }
  } catch (error: any) {
    logger.error("[promoteNextPending] 승격 실패:", {
      postId,
      error: error.message,
      stack: error.stack,
    });
    // 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}
