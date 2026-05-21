/**
 * 🔥 가격 이상 재점검 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 6시간 후 재점검 대상 게시물 자동 재점검
 * - 정상 범위 복귀 시 자동 해제
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { detectPriceAnomaly } from "./priceAnomalyDetection";

const BATCH_LIMIT = 100;

/**
 * 6시간 후 재점검 스케줄러 (10분마다)
 */
export const priceRecheckJob = onSchedule(
  { schedule: "*/10 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[priceRecheckJob] 가격 이상 재점검 시작");

    const now = Timestamp.now();
    const rechecked: any[] = [];

    try {
      // 🔥 6시간 후 재점검 대상 조회
      const recheckQueue = await db
        .collection("inspectionQueue")
        .where("reason", "==", "TEMPORARY_INSPECTION")
        .where("recheckAt", "<=", now)
        .limit(BATCH_LIMIT)
        .get();

      if (recheckQueue.empty) {
        logger.info("[priceRecheckJob] 재점검 대상 없음");
        return;
      }

      for (const queueDoc of recheckQueue.docs) {
        const queueData = queueDoc.data();
        const postId = queueData.postId;

        try {
          // 🔥 게시물 현재 상태 조회
          const postRef = db.collection("market").doc(postId);
          const postSnap = await postRef.get();

          if (!postSnap.exists) {
            // 게시물이 삭제된 경우 검수 큐에서 제거
            await queueDoc.ref.delete();
            continue;
          }

          const post = postSnap.data() as any;

          // 🔥 가격 이상 탐지 재실행
          const anomaly = await detectPriceAnomaly(postId, post);

          if (!anomaly.isAnomaly) {
            // 🔥 정상 범위 복귀 시 자동 해제
            await postRef.update({
              priceAnomaly: false,
              temporaryInspection: false,
              exposurePenalty: 0,
              updatedAt: FieldValue.serverTimestamp(),
            });

            // 🔥 검수 큐에서 제거
            await queueDoc.ref.delete();

            rechecked.push({
              postId,
              status: "RESOLVED",
              previousPrice: queueData.details?.price,
              currentPrice: post.price,
            });

            logger.info("[priceRecheckJob] 정상 범위 복귀:", {
              postId,
              previousPrice: queueData.details?.price,
              currentPrice: post.price,
            });
          } else {
            // 🔥 여전히 이상인 경우 검수 큐 상태 업데이트
            await queueDoc.ref.update({
              details: {
                ...queueData.details,
                price: post.price,
                deviation: anomaly.deviation,
                anomalyReason: anomaly.reason,
                recheckedAt: FieldValue.serverTimestamp(),
              },
              updatedAt: FieldValue.serverTimestamp(),
            });

            rechecked.push({
              postId,
              status: "STILL_ANOMALY",
              price: post.price,
              reason: anomaly.reason,
            });

            logger.warn("[priceRecheckJob] 여전히 이상:", {
              postId,
              price: post.price,
              reason: anomaly.reason,
            });
          }
        } catch (error: any) {
          logger.error("[priceRecheckJob] 재점검 실패:", {
            postId,
            error: error.message,
          });
        }
      }

      // 🔥 로그 기록
      await db.collection("ops_logs").add({
        type: "PRICE_RECHECK",
        startedAt: now,
        finishedAt: FieldValue.serverTimestamp(),
        recheckedCount: rechecked.length,
        resolvedCount: rechecked.filter((r) => r.status === "RESOLVED").length,
        rechecked: rechecked.slice(0, 50),
      });

      logger.info("[priceRecheckJob] 가격 이상 재점검 완료:", {
        recheckedCount: rechecked.length,
        resolvedCount: rechecked.filter((r) => r.status === "RESOLVED").length,
      });
    } catch (error: any) {
      logger.error("[priceRecheckJob] 가격 이상 재점검 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
