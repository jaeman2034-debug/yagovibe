/**
 * 🔥 가격 권장가 자동 제시 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 가격 이상 탐지 후 24시간 경과 시 자동 권장가 제시
 * - 판매자 코칭 메시지 발송
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";
import { calculateRegionalPriceStats } from "./priceAnomalyDetection";

const BATCH_LIMIT = 100;

/**
 * 24시간 후 자동 권장가 제시 스케줄러 (1시간마다)
 */
export const priceRecommendationJob = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[priceRecommendationJob] 가격 권장가 제시 시작");

    const now = Timestamp.now();
    const twentyFourHoursAgo = Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const recommended: any[] = [];

    try {
      // 🔥 24시간 전 가격 이상 탐지된 게시물 조회
      const anomalyPosts = await db
        .collection("market")
        .where("priceAnomaly", "==", true)
        .where("status", "==", "open")
        .where("updatedAt", ">=", twentyFourHoursAgo)
        .where("updatedAt", "<=", Timestamp.fromDate(new Date(Date.now() - 23 * 60 * 60 * 1000))) // 23-24시간 전
        .limit(BATCH_LIMIT)
        .get();

      if (anomalyPosts.empty) {
        logger.info("[priceRecommendationJob] 권장가 제시 대상 없음");
        return;
      }

      for (const postDoc of anomalyPosts.docs) {
        const post = postDoc.data() as any;
        const postId = postDoc.id;

        try {
          // 🔥 이미 권장가 제시된 경우 스킵
          if (post.priceRecommendationSent === true) {
            continue;
          }

          // 🔥 지역별 평균 가격 계산
          const regionalStats = await calculateRegionalPriceStats(
            post.category,
            post.location,
            30
          );

          if (!regionalStats) {
            logger.warn("[priceRecommendationJob] 지역 통계 없음:", { postId });
            continue;
          }

          // 🔥 권장가 계산 (평균 ± 10% 범위)
          const currentPrice = post.price || 0;
          const recommendedPrice = Math.round(regionalStats.mean);
          const recommendedMin = Math.round(regionalStats.mean * 0.9);
          const recommendedMax = Math.round(regionalStats.mean * 1.1);

          // 🔥 권장가 제시 플래그 설정
          await db.collection("market").doc(postId).update({
            priceRecommendationSent: true,
            priceRecommendation: {
              recommended: recommendedPrice,
              min: recommendedMin,
              max: recommendedMax,
              regionalMean: regionalStats.mean,
              sentAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          });

          // 🔥 판매자 코칭 메시지 발송
          await notify(post.authorId, {
            type: "JOIN_REJECTED_FULL", // 임시 타입
            title: "가격 권장가 안내",
            body: `등록하신 가격(${currentPrice.toLocaleString()}원)이 시장 평균과 다릅니다. 권장가: ${recommendedMin.toLocaleString()}원 ~ ${recommendedMax.toLocaleString()}원`,
            postId,
          });

          recommended.push({
            postId,
            currentPrice,
            recommendedPrice,
            recommendedMin,
            recommendedMax,
          });

          logger.info("[priceRecommendationJob] 권장가 제시:", {
            postId,
            currentPrice,
            recommendedPrice,
          });
        } catch (error: any) {
          logger.error("[priceRecommendationJob] 권장가 제시 실패:", {
            postId,
            error: error.message,
          });
        }
      }

      // 🔥 로그 기록
      await db.collection("ops_logs").add({
        type: "PRICE_RECOMMENDATION",
        startedAt: now,
        finishedAt: FieldValue.serverTimestamp(),
        recommendedCount: recommended.length,
        recommended: recommended.slice(0, 50),
      });

      logger.info("[priceRecommendationJob] 가격 권장가 제시 완료:", {
        recommendedCount: recommended.length,
      });
    } catch (error: any) {
      logger.error("[priceRecommendationJob] 가격 권장가 제시 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
