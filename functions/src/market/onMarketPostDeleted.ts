/**
 * 🔥 모집글 삭제 트리거 (대청소 파이프라인)
 * 
 * 역할:
 * - market 문서 삭제 시 연관 데이터 일괄 정리
 * - marketJoins 일괄 삭제
 * - 채팅방에 삭제 안내 메시지
 * - 관련 알림 정리
 * - 로그 기록
 */

import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";
import { once, buildIdempotencyKey } from "../utils/idempotency";
import { chunkDeleteByQuery } from "../utils/chunkDelete";

const db = firebaseAdmin.firestore();

/**
 * 모집글 삭제 감지
 * 
 * 트리거: market/{postId} 문서 삭제
 */
export const onMarketPostDeleted = onDocumentDeleted(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    const postId = event.params.postId as string;

    if (!post) {
      logger.info("[onMarketPostDeleted] 데이터 없음:", { postId });
      return;
    }

    const postTitle = post.title || "모집";
    const authorId = post.authorId || post.userId;

    logger.info("[onMarketPostDeleted] 모집글 삭제 감지:", {
      postId,
      postTitle,
      authorId,
    });

    // 🔥 멱등성 키 생성 (중복 실행 방지)
    const idempotencyKey = buildIdempotencyKey("postDeleted", postId);

    try {
      // 🔥 멱등성 보장: 한 번만 실행
      await once(idempotencyKey, async () => {
        // 🔥 1. marketJoins 일괄 삭제 (운영형: 500+ 안전)
        await deleteAllMarketJoins(postId);

        // 🔥 2. 채팅방에 삭제 안내 메시지
        await notifyChatRooms(postId, postTitle);

        // 🔥 3. 관련 알림 정리 (운영형: 500+ 안전)
        await cleanNotifications(postId);

        // 🔥 4. 운영 로그 기록
        await db.collection("_marketPostDeletionLogs").add({
          postId,
          postTitle,
          authorId,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          category: post.category || "equipment",
          idempotencyKey,
        });

        logger.info("[onMarketPostDeleted] 모집글 삭제 처리 완료:", { postId });
      });
    } catch (error: any) {
      logger.error("[onMarketPostDeleted] 삭제 처리 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 메인 로직은 계속 진행 (Fail-safe)
    }
  }
);

/**
 * 🔥 marketJoins 일괄 삭제 (운영형: 500+ 안전 처리)
 */
async function deleteAllMarketJoins(postId: string): Promise<void> {
  try {
    logger.info("[deleteAllMarketJoins] 시작:", { postId });

    const query = db
      .collection("marketJoins")
      .where("postId", "==", postId);

    const totalDeleted = await chunkDeleteByQuery(query);

    logger.info("[deleteAllMarketJoins] 전체 삭제 완료:", {
      postId,
      totalDeleted,
    });
  } catch (error: any) {
    logger.error("[deleteAllMarketJoins] 삭제 실패:", {
      postId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 🔥 채팅방에 삭제 안내 메시지 발송
 */
async function notifyChatRooms(postId: string, postTitle: string): Promise<void> {
  try {
    logger.info("[notifyChatRooms] 시작:", { postId });

    // 🔥 productId로 채팅방 조회
    const roomsQuery = db
      .collection("chatRooms")
      .where("productId", "==", postId);

    const roomsSnap = await roomsQuery.get();

    if (roomsSnap.empty) {
      logger.info("[notifyChatRooms] 관련 채팅방 없음:", { postId });
      return;
    }

    const messageText = `🗑 "${postTitle}" 모집글이 삭제되었습니다.`;

    // 🔥 각 채팅방에 시스템 메시지 발송
    const promises = roomsSnap.docs.map(async (roomDoc) => {
      try {
        const messagesRef = roomDoc.ref.collection("messages");
        await messagesRef.add({
          text: messageText,
          type: "system",
          systemType: "POST_DELETED",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            postId,
            postTitle,
          },
        });

        // 채팅방 lastMessage 업데이트
        await roomDoc.ref.update({
          lastMessage: messageText,
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("[notifyChatRooms] 채팅방 안내 메시지 발송:", {
          roomId: roomDoc.id,
          postId,
        });
      } catch (roomError: any) {
        logger.error("[notifyChatRooms] 채팅방 메시지 발송 실패:", {
          roomId: roomDoc.id,
          postId,
          error: roomError.message,
        });
        // 개별 채팅방 실패해도 계속 진행
      }
    });

    await Promise.all(promises);

    logger.info("[notifyChatRooms] 완료:", {
      postId,
      notifiedRooms: roomsSnap.size,
    });
  } catch (error: any) {
    logger.error("[notifyChatRooms] 실패:", {
      postId,
      error: error.message,
    });
    // 채팅방 안내 실패해도 메인 로직은 계속 진행
  }
}

/**
 * 🔥 관련 알림 정리 (운영형: 500+ 안전 처리)
 */
async function cleanNotifications(postId: string): Promise<void> {
  try {
    logger.info("[cleanNotifications] 시작:", { postId });

    let totalDeleted = 0;

    // 🔥 방법 1: payload.postId로 조회 (인덱스 필요)
    try {
      const query1 = db
        .collection("notifications")
        .where("payload.postId", "==", postId);
      totalDeleted += await chunkDeleteByQuery(query1);
    } catch (error: any) {
      logger.warn("[cleanNotifications] payload.postId 쿼리 실패, target.id로 시도:", {
        postId,
        error: error.message,
      });
    }

    // 🔥 방법 2: target.id로 조회 (하위 호환성)
    try {
      const query2 = db
        .collection("notifications")
        .where("target.id", "==", postId);
      totalDeleted += await chunkDeleteByQuery(query2);
    } catch (error: any) {
      logger.warn("[cleanNotifications] target.id 쿼리 실패:", {
        postId,
        error: error.message,
      });
    }

    logger.info("[cleanNotifications] 전체 삭제 완료:", {
      postId,
      totalDeleted,
    });
  } catch (error: any) {
    logger.error("[cleanNotifications] 삭제 실패:", {
      postId,
      error: error.message,
      stack: error.stack,
    });
    // 알림 정리 실패해도 메인 로직은 계속 진행
  }
}
