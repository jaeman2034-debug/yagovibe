/**
 * 🔥 사용자 이벤트 트래킹 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 클릭, 채팅, 찜, 거래 이벤트 수집
 * - 프로필 업데이트 파이프라인
 * - 추천 엔진 학습 데이터
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { generateEmbedding as createEmbedding } from "./embedding";

/**
 * 이벤트 타입
 */
export type UserEventType = "click" | "chat" | "favorite" | "trade" | "view";

/**
 * 사용자 이벤트 데이터
 */
interface UserEvent {
  userId: string;
  postId: string;
  type: UserEventType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 사용자 프로필 업데이트
 */
async function updateUserProfile(userId: string, event: UserEvent): Promise<void> {
  const userRef = db.collection("users").doc(userId);

  // 🔥 이벤트 타입별 히스토리 업데이트
  const updateFields: Record<string, any> = {};

  switch (event.type) {
    case "click":
      updateFields.clickHistory = FieldValue.arrayUnion(event.postId);
      break;
    case "chat":
      updateFields.chatHistory = FieldValue.arrayUnion(event.postId);
      break;
    case "favorite":
      updateFields.favoriteHistory = FieldValue.arrayUnion(event.postId);
      break;
    case "trade":
      updateFields.tradeHistory = FieldValue.arrayUnion(event.postId);
      break;
    case "view":
      updateFields.viewHistory = FieldValue.arrayUnion(event.postId);
      break;
  }

  // 🔥 최근 100개만 유지
  await userRef.update(updateFields);

  // 🔥 관심사 추출 및 임베딩 업데이트 (비동기)
  try {
    const postSnap = await db.collection("market").doc(event.postId).get();
    if (postSnap.exists) {
      const postData = postSnap.data();
      const title = postData?.title || "";
      const category = postData?.category || "";

      // 🔥 관심사 키워드 추출
      const keywords = [title, category].filter(Boolean).join(" ");

      // 🔥 사용자 임베딩 업데이트 (관심사 기반)
      const userEmbedding = await createEmbedding(keywords);
      await userRef.update({
        embedding: userEmbedding,
        embeddingUpdatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error: any) {
    logger.warn("[updateUserProfile] 임베딩 업데이트 실패:", {
      userId,
      postId: event.postId,
      error: error.message,
    });
  }
}

/**
 * 게시글 통계 업데이트
 */
async function updatePostStats(postId: string, eventType: UserEventType): Promise<void> {
  const postRef = db.collection("market").doc(postId);
  const updateFields: Record<string, any> = {};

  switch (eventType) {
    case "click":
    case "view":
      updateFields.viewCount = FieldValue.increment(1);
      break;
    case "chat":
      updateFields.chatCount = FieldValue.increment(1);
      break;
    case "favorite":
      updateFields.favoriteCount = FieldValue.increment(1);
      break;
    case "trade":
      updateFields.tradeCount = FieldValue.increment(1);
      break;
  }

  if (Object.keys(updateFields).length > 0) {
    await postRef.update(updateFields);
  }
}

/**
 * 사용자 이벤트 트리거
 */
export const onUserEvent = onDocumentCreated(
  {
    document: "userEvents/{eventId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }

    const eventId = event.params.eventId;
    const { userId, postId, type } = data;

    if (!userId || !postId || !type) {
      logger.warn("[onUserEvent] 필수 필드 누락:", { eventId, userId, postId, type });
      return;
    }

    try {
      const userEvent: UserEvent = {
        userId,
        postId,
        type: type as UserEventType,
        timestamp: new Date(),
        metadata: data.metadata,
      };

      // 🔥 사용자 프로필 업데이트
      await updateUserProfile(userId, userEvent);

      // 🔥 게시글 통계 업데이트
      await updatePostStats(postId, type as UserEventType);

      logger.info("[onUserEvent] 이벤트 처리 완료:", {
        eventId,
        userId,
        postId,
        type,
      });
    } catch (error: any) {
      logger.error("[onUserEvent] 이벤트 처리 실패:", {
        eventId,
        userId,
        postId,
        type,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
