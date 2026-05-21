/**
 * 🔥 Like 생성 시 트리거
 * 
 * 역할:
 * - Entity의 likesCount 증가
 * - Notification 생성 (좋아요 받은 사용자에게)
 */

import { logger } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

/**
 * Like 생성 시 트리거
 */
export const onLikeCreated = onDocumentCreated(
  {
    document: "likes/{likeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const likeData = event.data?.data();
    if (!likeData) {
      logger.warn("⚠️ [onLikeCreated] Like 데이터 없음");
      return;
    }

    const { userId, entityType, entityId } = likeData;

    try {
      // 1. Entity의 likesCount 증가
      const entityRef = getEntityRef(entityType, entityId);
      if (entityRef) {
        await entityRef.update({
          likesCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`✅ [onLikeCreated] ${entityType} ${entityId} likesCount 증가`);
      }

      // 2. Notification 생성 (좋아요 받은 사용자에게)
      // Entity 소유자 조회
      const entityDoc = await entityRef?.get();
      if (entityDoc?.exists) {
        const entity = entityDoc.data();
        const ownerId = entity.uploadedBy || entity.authorId || entity.ownerId;

        // 자신이 좋아요한 경우 알림 생성 안 함
        if (ownerId && ownerId !== userId) {
          await createLikeNotification(ownerId, userId, entityType, entityId);
        }
      }
    } catch (error: any) {
      logger.error("❌ [onLikeCreated] 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * Like 삭제 시 트리거
 */
export const onLikeDeleted = onDocumentDeleted(
  {
    document: "likes/{likeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const likeData = event.data?.data();
    if (!likeData) {
      logger.warn("⚠️ [onLikeDeleted] Like 데이터 없음");
      return;
    }

    const { entityType, entityId } = likeData;

    try {
      // Entity의 likesCount 감소
      const entityRef = getEntityRef(entityType, entityId);
      if (entityRef) {
        await entityRef.update({
          likesCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`✅ [onLikeDeleted] ${entityType} ${entityId} likesCount 감소`);
      }
    } catch (error: any) {
      logger.error("❌ [onLikeDeleted] 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * Entity 참조 가져오기
 */
function getEntityRef(entityType: string, entityId: string) {
  switch (entityType) {
    case "media":
      return db.collection("media").doc(entityId);
    case "match":
      return db.collection("event_matches").doc(entityId);
    case "team":
      return db.collection("teams").doc(entityId);
    case "player":
      return db.collection("users").doc(entityId);
    case "event":
      return db.collection("events").doc(entityId);
    default:
      return null;
  }
}

/**
 * Like 알림 생성
 */
async function createLikeNotification(
  ownerId: string,
  likerId: string,
  entityType: string,
  entityId: string
) {
  try {
    // 좋아요한 사용자 정보 조회
    const likerDoc = await db.collection("users").doc(likerId).get();
    const likerName = likerDoc.data()?.displayName || likerDoc.data()?.name || "누군가";

    // Entity 정보 조회
    const entityRef = getEntityRef(entityType, entityId);
    const entityDoc = await entityRef?.get();
    const entityName = entityDoc?.data()?.title || entityDoc?.data()?.name || "콘텐츠";

    const notificationData = {
      userId: ownerId,
      type: "LIKE_RECEIVED",
      title: "좋아요",
      message: `${likerName}님이 ${entityName}에 좋아요를 눌렀습니다`,
      target: {
        screen: entityType === "media" ? "media" : entityType,
        id: entityId,
      },
      priority: "normal",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      payload: {
        likerId,
        entityType,
        entityId,
      },
    };

    await db.collection("notifications").add(notificationData);
    logger.info(`✅ [onLikeCreated] 알림 생성: ${ownerId}`);
  } catch (error: any) {
    logger.error("❌ [onLikeCreated] 알림 생성 실패:", error.message);
  }
}
