/**
 * 🔥 자동 응답 만족도 모니터링 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 만족도 4.5↓ 시 문구 리비전
 * - 오분류 2%↑ → 룰 재학습
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 만족도 임계값 (완전 운영)
const SATISFACTION_THRESHOLD = 4.85; // 만족도 4.85 이하 시 문구 개편 (4.8 → 4.85로 상향)
const MISCLASSIFICATION_THRESHOLD = 0.004; // 오분류 0.4% 이상 시 재학습 (0.5% → 0.4%로 강화)

/**
 * 만족도 피드백 업데이트 시 처리
 */
export const onSatisfactionUpdated = onDocumentUpdated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const disputeId = event.params.disputeId;

    // 🔥 만족도가 새로 추가되거나 변경된 경우
    if (before.satisfaction !== after.satisfaction && after.satisfaction) {
      const satisfaction = typeof after.satisfaction === "number" ? after.satisfaction : Number(after.satisfaction || 0);

      logger.info("[onSatisfactionUpdated] 만족도 업데이트:", {
        disputeId,
        satisfaction,
      });

      // 🔥 만족도 4.8 이하 시 문구 개편 요청
      if (satisfaction <= SATISFACTION_THRESHOLD) {
        await db.collection("templateRevisionQueue").add({
          disputeId,
          disputeType: after.type,
          satisfaction,
          templateUsed: after.autoResponse,
          revisionReason: "LOW_SATISFACTION",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.warn("[onSatisfactionUpdated] 만족도 낮음, 문구 개편 요청:", {
          disputeId,
          satisfaction,
          threshold: SATISFACTION_THRESHOLD,
        });
      }
    }
  }
);

/**
 * 오분류 모니터링
 */
export const onMisclassificationDetected = onDocumentUpdated(
  {
    document: "humanReviewQueue/{reviewId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const reviewId = event.params.reviewId;

    // 🔥 리뷰 완료 시 오분류 체크
    if (before.status !== "COMPLETED" && after.status === "COMPLETED") {
      const autoClassifiedType = after.autoClassifiedType;
      const humanReviewedType = after.humanReviewedType;
      const isMisclassified = autoClassifiedType !== humanReviewedType;

      if (isMisclassified) {
        logger.warn("[onMisclassificationDetected] 오분류 감지:", {
          reviewId,
          autoClassifiedType,
          humanReviewedType,
        });

        // 🔥 오분류 통계 업데이트
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = Timestamp.fromDate(today);

        const statsRef = db.collection("classificationStats").doc("daily");

        await db.runTransaction(async (tx) => {
          const statsSnap = await tx.get(statsRef);
          const stats = statsSnap.exists ? statsSnap.data() : {
            totalReviews: 0,
            misclassifications: 0,
            misclassificationRate: 0,
            lastUpdated: FieldValue.serverTimestamp(),
          };

          const newTotalReviews = (stats.totalReviews || 0) + 1;
          const newMisclassifications = (stats.misclassifications || 0) + 1;
          const newMisclassificationRate = newMisclassifications / newTotalReviews;

          tx.set(statsRef, {
            totalReviews: newTotalReviews,
            misclassifications: newMisclassifications,
            misclassificationRate: newMisclassificationRate,
            lastUpdated: FieldValue.serverTimestamp(),
          }, { merge: true });

          // 🔥 오분류 2% 이상 시 재학습 요청
          if (newMisclassificationRate >= MISCLASSIFICATION_THRESHOLD) {
            await db.collection("classificationRetrain").add({
              triggeredAt: FieldValue.serverTimestamp(),
              misclassificationRate: newMisclassificationRate,
              threshold: MISCLASSIFICATION_THRESHOLD,
              reason: "MISCLASSIFICATION_ABOVE_THRESHOLD",
            });

            logger.warn("[onMisclassificationDetected] 오분류 임계값 초과, 재학습 요청:", {
              misclassificationRate: newMisclassificationRate,
              threshold: MISCLASSIFICATION_THRESHOLD,
            });
          }
        });
      }
    }
  }
);
