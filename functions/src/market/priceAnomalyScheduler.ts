/**
 * 🔥 가격 이상 탐지 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 주기적으로 모든 게시물 가격 이상 탐지
 * - 검수 큐 자동 등록
 * - 노출 가중치 자동 조정
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { detectPriceAnomaly } from "./priceAnomalyDetection";

const BATCH_LIMIT = 100;
const EXPOSURE_PENALTY = 0.3; // 노출 -30%

/**
 * 주기적 가격 이상 탐지 (매일 새벽 3시)
 */
export const priceAnomalyCheckJob = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[priceAnomalyCheckJob] 가격 이상 탐지 시작");

    const startedAt = Timestamp.now();
    const anomalies: any[] = [];

    try {
      // 🔥 최근 7일 내 생성/수정된 equipment 게시물 조회
      const sevenDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      let lastDoc: any = null;
      let hasMore = true;

      while (hasMore) {
        let query = db
          .collection("market")
          .where("category", "==", "equipment")
          .where("status", "==", "open")
          .where("price", ">", 0)
          .orderBy("price")
          .orderBy("updatedAt", "desc")
          .limit(BATCH_LIMIT);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const postsSnap = await query.get();

        if (postsSnap.empty) {
          hasMore = false;
          break;
        }

        for (const postDoc of postsSnap.docs) {
          const postId = postDoc.id;
          const post = postDoc.data();

          // 🔥 이미 이상 탐지된 게시물은 스킵 (선택적)
          if (post.priceAnomaly === true) {
            continue;
          }

          try {
            const anomaly = await detectPriceAnomaly(postId, post);

            if (anomaly.isAnomaly) {
              // 🔥 검수 큐 자동 등록
              await db.collection("inspectionQueue").add({
                postId,
                userId: post.authorId,
                reason: "PRICE_ANOMALY",
                details: {
                  price: post.price,
                  category: post.category,
                  location: post.location,
                  deviation: anomaly.deviation,
                  anomalyReason: anomaly.reason,
                },
                priority: "HIGH",
                createdAt: FieldValue.serverTimestamp(),
              });

              // 🔥 노출 가중치 -30% 적용
              await postDoc.ref.update({
                priceAnomaly: true,
                priceAnomalyReason: anomaly.reason,
                priceAnomalyDeviation: anomaly.deviation,
                exposurePenalty: EXPOSURE_PENALTY,
                updatedAt: FieldValue.serverTimestamp(),
              });

              anomalies.push({
                postId,
                price: post.price,
                reason: anomaly.reason,
                deviation: anomaly.deviation,
              });

              logger.info("[priceAnomalyCheckJob] 가격 이상 탐지:", {
                postId,
                price: post.price,
                reason: anomaly.reason,
              });
            }
          } catch (error: any) {
            logger.error("[priceAnomalyCheckJob] 가격 이상 탐지 실패:", {
              postId,
              error: error.message,
            });
          }
        }

        lastDoc = postsSnap.docs[postsSnap.docs.length - 1];
        hasMore = postsSnap.size === BATCH_LIMIT;
      }

      // 🔥 로그 기록
      await db.collection("ops_logs").add({
        type: "PRICE_ANOMALY_CHECK",
        startedAt,
        finishedAt: FieldValue.serverTimestamp(),
        scanned: anomalies.length,
        anomaliesFound: anomalies.length,
        anomalies: anomalies.slice(0, 50), // 최대 50개만 저장
      });

      logger.info("[priceAnomalyCheckJob] 가격 이상 탐지 완료:", {
        anomaliesFound: anomalies.length,
      });
    } catch (error: any) {
      logger.error("[priceAnomalyCheckJob] 가격 이상 탐지 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
