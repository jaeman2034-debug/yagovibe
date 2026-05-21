/**
 * 🔥 부스트 어뷰징 탐지 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 동일 계정 24h 3회 초과 → 부스트 제외
 * - 반복 패턴 → 72h 정지
 * - 낚시 매물 반복 생성 방지
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const BOOST_LIMIT_PER_24H = 3; // 24시간 내 최대 부스트 횟수
const SUSPENSION_HOURS = 72; // 반복 패턴 시 72시간 정지
const PATTERN_THRESHOLD = 5; // 반복 패턴 임계값 (30일 내)

/**
 * 부스트 어뷰징 패턴 정의
 */
interface AbusePattern {
  type: "FREQUENT_POSTING" | "LOW_QUALITY_SPAM" | "DUPLICATE_CONTENT";
  count: number;
  detectedAt: Date;
}

/**
 * 게시물 생성 시 부스트 어뷰징 감지
 */
export const onBoostAbuseCheck = onDocumentCreated(
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

    // 🔥 이미지 품질 90 미만이면 부스트 자동 제외 (별도 처리)
    if (imageQuality < 90) {
      return;
    }

    logger.info("[onBoostAbuseCheck] 부스트 어뷰징 체크 시작:", {
      postId,
      authorId,
      imageQuality,
    });

    try {
      // 🔥 1. 24시간 내 부스트 횟수 체크
      const twentyFourHoursAgo = Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const recentBoostedPosts = await db
        .collection("market")
        .where("authorId", "==", authorId)
        .where("boostActive", "==", true)
        .where("boostStartTime", ">=", twentyFourHoursAgo)
        .get();

      const boostCount24h = recentBoostedPosts.size;

      logger.info("[onBoostAbuseCheck] 24시간 내 부스트 횟수:", {
        authorId,
        boostCount24h,
      });

      // 🔥 2. 24시간 내 3회 초과 → 부스트 제외
      if (boostCount24h >= BOOST_LIMIT_PER_24H) {
        await db.collection("market").doc(postId).update({
          boostBlocked: true,
          boostBlockReason: "FREQUENT_POSTING_24H",
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onBoostAbuseCheck] 부스트 제외 (24h 3회 초과):", {
          postId,
          authorId,
          boostCount24h,
        });

        // 🔥 부스트 제외 알림 (선택적)
        // await notify(authorId, {
        //   type: "BOOST_BLOCKED",
        //   title: "부스트 제한 안내",
        //   body: "24시간 내 부스트 횟수를 초과했습니다. 내일 다시 시도해주세요.",
        //   postId,
        // });

        return; // 부스트 제외 후 종료
      }

      // 🔥 3. 반복 패턴 감지 (30일 내)
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const recentPosts = await db
        .collection("market")
        .where("authorId", "==", authorId)
        .where("createdAt", ">=", thirtyDaysAgo)
        .get();

      const postCount30d = recentPosts.size;

      // 🔥 반복 패턴 판정: 30일 내 5회 이상 + 저품질 비율 높음
      const lowQualityPosts = recentPosts.docs.filter(
        (doc) => (doc.data().imageQuality || 0) < 90
      ).length;

      const lowQualityRate = postCount30d > 0 ? lowQualityPosts / postCount30d : 0;

      // 🔥 반복 패턴 조건: 30일 내 5회 이상 + 저품질 비율 60% 이상
      if (postCount30d >= PATTERN_THRESHOLD && lowQualityRate >= 0.6) {
        // 🔥 사용자 정지 상태 확인
        const userRef = db.collection("users").doc(authorId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          logger.warn("[onBoostAbuseCheck] 사용자 정보 없음:", { authorId });
          return;
        }

        const userData = userSnap.data() as any;
        const suspendedUntil = userData.suspendedUntil?.toDate?.() || 
          (userData.suspendedUntil?.seconds ? 
            new Date(userData.suspendedUntil.seconds * 1000) : null);

        // 🔥 이미 정지 중인 경우 스킵
        if (suspendedUntil && suspendedUntil > new Date()) {
          logger.info("[onBoostAbuseCheck] 이미 정지 중:", {
            authorId,
            suspendedUntil: suspendedUntil.toISOString(),
          });
          return;
        }

        // 🔥 72시간 정지 처리
        const suspensionEndTime = new Date(Date.now() + SUSPENSION_HOURS * 60 * 60 * 1000);

        await userRef.update({
          suspendedUntil: Timestamp.fromDate(suspensionEndTime),
          suspensionReason: "BOOST_ABUSE_PATTERN",
          suspensionCount: (userData.suspensionCount || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 부스트 제외
        await db.collection("market").doc(postId).update({
          boostBlocked: true,
          boostBlockReason: "ABUSE_PATTERN_DETECTED",
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 CS 검수 큐 자동 연결
        await db.collection("inspectionQueue").add({
          userId: authorId,
          reason: "BOOST_ABUSE_PATTERN",
          details: {
            postCount30d,
            lowQualityRate,
            suspensionEndTime: suspensionEndTime.toISOString(),
            postIds: recentPosts.docs.map((doc) => doc.id),
          },
          priority: "HIGH",
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onBoostAbuseCheck] 반복 패턴 감지, 사용자 정지:", {
          authorId,
          postCount30d,
          lowQualityRate,
          suspensionEndTime: suspensionEndTime.toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("[onBoostAbuseCheck] 부스트 어뷰징 감지 실패:", {
        postId,
        authorId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
