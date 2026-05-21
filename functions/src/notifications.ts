/**
 * 🔥 알림 엔진: 인앱 + FCM + 중복방지 (프로덕션 배포 패키지)
 * 
 * ✅ idempotency(중복 발송 방지): `ops_events/{eventKey}`로 1회성 처리
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "./firebase";
import { sendFCM } from "./push";

export type NotiType =
  | "JOIN_APPROVED"
  | "JOIN_REJECTED_FULL"
  | "JOIN_REJECTED"
  | "WAITLIST_PROMOTED";

type NotiData = {
  type: NotiType;
  title: string;
  body: string;
  postId: string;
  chatRoomId?: string;
};

/**
 * 인앱 알림 저장
 */
async function saveInApp(uid: string, data: NotiData) {
  await db
    .collection("notifications")
    .doc(uid)
    .collection("items")
    .add({
      type: data.type,
      title: data.title,
      body: data.body,
      postId: data.postId,
      ...(data.chatRoomId && { chatRoomId: data.chatRoomId }),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * 알림 발송 (인앱 + FCM)
 */
export async function notify(uid: string, data: NotiData) {
  await Promise.all([
    saveInApp(uid, data),
    sendFCM(uid, {
      title: data.title,
      body: data.body,
      data: {
        type: data.type,
        postId: data.postId,
        chatRoomId: data.chatRoomId ?? "",
        route: data.chatRoomId 
          ? `/app/chat/${data.chatRoomId}` 
          : `/app/market/${data.postId}`,
      },
    }),
  ]);
}

/**
 * 이벤트 1회성 처리 (중복 트리거/재시도 대응)
 */
async function runOnce(eventKey: string, fn: () => Promise<void>) {
  const ref = db.collection("ops_events").doc(eventKey);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return; // already processed
    tx.set(ref, { createdAt: FieldValue.serverTimestamp() });
  });

  // 트랜잭션 커밋 이후에 실행
  await fn();
}

/**
 * 매칭 참여 상태 변경 감지
 * 
 * 트리거: marketJoins/{joinId} 문서 업데이트
 */
export const onJoinStatusChanged = onDocumentUpdated(
  {
    document: "marketJoins/{joinId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const joinId = event.params.joinId as string;

    if (!before || !after) {
      logger.info("[onJoinStatusChanged] 데이터 없음:", { joinId });
      return;
    }

    // 🔥 상태 변경이 없으면 무시
    if (before.status === after.status && before.rejectedReason === after.rejectedReason) {
      logger.info("[onJoinStatusChanged] 상태 변경 없음:", { joinId });
      return;
    }

    const postId = after.postId;
    const userId = after.userId;
    const newStatus = after.status;
    const oldStatus = before.status;

    logger.info("[onJoinStatusChanged] 상태 변경 감지:", {
      joinId,
      postId,
      userId,
      oldStatus,
      newStatus,
    });

    try {
      const postSnap = await db.collection("market").doc(postId).get();
      const post = postSnap.data() as any;
      
      if (!post) {
        logger.warn("[onJoinStatusChanged] 게시글 없음:", { postId });
        return;
      }

      const postTitle = post.title ?? "매칭";
      const chatRoomId = `${postId}_${userId}_${post.authorId}`;

      // 🔥 승인 시 알림 발송
      if (newStatus === "approved" && oldStatus === "pending") {
        const eventKey = `join_approved:${postId}:${userId}:${event.id}`;
        await runOnce(eventKey, async () => {
          await notify(userId, {
            type: "JOIN_APPROVED",
            title: "매칭 참여 승인",
            body: `"${postTitle}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`,
            postId,
            chatRoomId,
          });
        });
        logger.info("JOIN_APPROVED notified", { postId, userId });
      }

      // 🔥 FULL 자동거절 시 알림 발송
      if (
        newStatus === "rejected" &&
        oldStatus === "pending" &&
        after.rejectedReason === "FULL_AUTO"
      ) {
        const eventKey = `join_full_rejected:${postId}:${userId}:${event.id}`;
        await runOnce(eventKey, async () => {
          await notify(userId, {
            type: "JOIN_REJECTED_FULL",
            title: "매칭 참여 자동 거절",
            body: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
            postId,
          });
        });
        logger.info("JOIN_REJECTED_FULL notified", { postId, userId });
      }

      // 🔥 수동 거절 시 알림 발송
      if (
        newStatus === "rejected" &&
        oldStatus === "pending" &&
        after.rejectedReason !== "FULL_AUTO"
      ) {
        const eventKey = `join_rejected:${postId}:${userId}:${event.id}`;
        await runOnce(eventKey, async () => {
          await notify(userId, {
            type: "JOIN_REJECTED",
            title: "매칭 참여 거절",
            body: `"${postTitle}" 매칭 참여가 거절되었습니다.`,
            postId,
          });
        });
        logger.info("JOIN_REJECTED notified", { postId, userId });
      }
    } catch (error: any) {
      logger.error("[onJoinStatusChanged] 알림 발송 실패:", {
        joinId,
        error: error.message,
        stack: error.stack,
      });
      // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
    }
  }
);
