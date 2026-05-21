/**
 * 🔥 저품질 반복 게시물 감지 및 정지 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 저품질 게시물 3회 이상 작성자 감지
 * - 48시간 정지 처리
 * - CS 검수 큐 자동 연결
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const MIN_IMAGE_QUALITY = 90;
const LOW_QUALITY_THRESHOLD = 3; // 저품질 게시물 3회 이상
const SUSPENSION_HOURS = 48; // 48시간 정지

/**
 * 게시물 생성 시 저품질 감지
 */
export const onLowQualityPostCreated = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const authorId = post.authorId;
    const imageQuality = post.imageQuality || 0;

    // 🔥 이미지 품질 90 미만인 경우만 처리
    if (imageQuality >= MIN_IMAGE_QUALITY) {
      return;
    }

    logger.info("[onLowQualityPostCreated] 저품질 게시물 감지:", {
      postId,
      authorId,
      imageQuality,
    });

    try {
      // 🔥 최근 30일 내 저품질 게시물 수 집계
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const lowQualityPosts = await db
        .collection("market")
        .where("authorId", "==", authorId)
        .where("imageQuality", "<", MIN_IMAGE_QUALITY)
        .where("createdAt", ">=", thirtyDaysAgo)
        .get();

      const lowQualityCount = lowQualityPosts.size;

      logger.info("[onLowQualityPostCreated] 저품질 게시물 수:", {
        authorId,
        lowQualityCount,
      });

      // 🔥 3회 이상인 경우 조치
      if (lowQualityCount >= LOW_QUALITY_THRESHOLD) {
        // 🔥 사용자 정지 상태 확인
        const userRef = db.collection("users").doc(authorId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          logger.warn("[onLowQualityPostCreated] 사용자 정보 없음:", { authorId });
          return;
        }

        const userData = userSnap.data() as any;
        const suspendedUntil = userData.suspendedUntil?.toDate?.() || 
          (userData.suspendedUntil?.seconds ? 
            new Date(userData.suspendedUntil.seconds * 1000) : null);

        // 🔥 이미 정지 중인 경우 스킵
        if (suspendedUntil && suspendedUntil > new Date()) {
          logger.info("[onLowQualityPostCreated] 이미 정지 중:", {
            authorId,
            suspendedUntil: suspendedUntil.toISOString(),
          });
          return;
        }

        // 🔥 48시간 정지 처리
        const suspensionEndTime = new Date(Date.now() + SUSPENSION_HOURS * 60 * 60 * 1000);

        await userRef.update({
          suspendedUntil: Timestamp.fromDate(suspensionEndTime),
          suspensionReason: "REPEATED_LOW_QUALITY",
          suspensionCount: (userData.suspensionCount || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 CS 검수 큐 자동 연결
        await db.collection("inspectionQueue").add({
          userId: authorId,
          reason: "REPEATED_LOW_QUALITY",
          details: {
            lowQualityCount,
            suspensionEndTime: suspensionEndTime.toISOString(),
            postIds: lowQualityPosts.docs.map((doc) => doc.id),
          },
          priority: "HIGH",
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onLowQualityPostCreated] 사용자 정지 처리:", {
          authorId,
          lowQualityCount,
          suspensionEndTime: suspensionEndTime.toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("[onLowQualityPostCreated] 저품질 감지 실패:", {
        postId,
        authorId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
