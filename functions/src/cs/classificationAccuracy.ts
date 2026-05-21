/**
 * 🔥 분류 정확도 모니터링 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 자동 분류 오차 모니터링
 * - 5% 샘플 휴먼 리뷰
 * - 오차 3%↑ → 룰 재학습
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 분류 정확도 목표 (완전 운영)
const CLASSIFICATION_ACCURACY_TARGET = 0.99; // 99% (유지)
const CLASSIFICATION_ERROR_THRESHOLD = 0.004; // 오차 0.4% 이상 시 재학습 (0.5% → 0.4%로 강화)
const SATISFACTION_THRESHOLD = 4.85; // 만족도 4.85 이하 시 문구 개편 (4.8 → 4.85로 상향)

/**
 * 휴먼 리뷰 결과 업데이트 시 정확도 계산
 */
export const onHumanReviewUpdated = onDocumentUpdated(
  {
    document: "humanReviewQueue/{reviewId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const reviewId = event.params.reviewId;

    // 🔥 리뷰 완료 시에만 처리
    if (before.status !== "COMPLETED" && after.status === "COMPLETED") {
      const autoClassifiedType = after.autoClassifiedType;
      const humanReviewedType = after.humanReviewedType;
      const isCorrect = autoClassifiedType === humanReviewedType;

      logger.info("[onHumanReviewUpdated] 휴먼 리뷰 완료:", {
        reviewId,
        autoClassifiedType,
        humanReviewedType,
        isCorrect,
      });

      // 🔥 정확도 통계 업데이트
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Timestamp.fromDate(today);

      const statsRef = db.collection("classificationStats").doc("daily");

      await db.runTransaction(async (tx) => {
        const statsSnap = await tx.get(statsRef);
        const stats = statsSnap.exists ? statsSnap.data() : {
          totalReviews: 0,
          correctClassifications: 0,
          accuracy: 0,
          lastUpdated: FieldValue.serverTimestamp(),
        };

        const newTotalReviews = (stats.totalReviews || 0) + 1;
        const newCorrectClassifications = (stats.correctClassifications || 0) + (isCorrect ? 1 : 0);
        const newAccuracy = newCorrectClassifications / newTotalReviews;

        tx.set(statsRef, {
          totalReviews: newTotalReviews,
          correctClassifications: newCorrectClassifications,
          accuracy: newAccuracy,
          lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });

        // 🔥 오차 3% 이상 시 재학습 플래그 설정
        if (newAccuracy < (CLASSIFICATION_ACCURACY_TARGET - CLASSIFICATION_ERROR_THRESHOLD)) {
          await db.collection("classificationRetrain").add({
            triggeredAt: FieldValue.serverTimestamp(),
            currentAccuracy: newAccuracy,
            targetAccuracy: CLASSIFICATION_ACCURACY_TARGET,
            reason: "ACCURACY_BELOW_THRESHOLD",
          });

          logger.warn("[onHumanReviewUpdated] 분류 정확도 임계값 하회, 재학습 필요:", {
            currentAccuracy: newAccuracy,
            targetAccuracy: CLASSIFICATION_ACCURACY_TARGET,
          });
        }
      });
    }
  }
);

/**
 * 분류 정확도 일일 리포트
 */
export const classificationAccuracyReport = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[classificationAccuracyReport] 분류 정확도 리포트 생성 시작");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStart = Timestamp.fromDate(yesterday);
      const yesterdayEnd = Timestamp.fromDate(
        new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
      );

      // 🔥 어제 휴먼 리뷰 결과 집계
      const reviews = await db
        .collection("humanReviewQueue")
        .where("createdAt", ">=", yesterdayStart)
        .where("createdAt", "<", yesterdayEnd)
        .where("status", "==", "COMPLETED")
        .get();

      let totalReviews = 0;
      let correctClassifications = 0;

      reviews.docs.forEach((doc) => {
        const review = doc.data();
        totalReviews++;
        if (review.autoClassifiedType === review.humanReviewedType) {
          correctClassifications++;
        }
      });

      const accuracy = totalReviews > 0 ? correctClassifications / totalReviews : 0;

      // 🔥 리포트 저장
      await db.collection("classificationReports").add({
        date: yesterdayStart,
        totalReviews,
        correctClassifications,
        accuracy,
        targetAccuracy: CLASSIFICATION_ACCURACY_TARGET,
        meetsTarget: accuracy >= CLASSIFICATION_ACCURACY_TARGET,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info("[classificationAccuracyReport] 분류 정확도 리포트 생성 완료:", {
        date: yesterdayStart.toDate().toISOString(),
        totalReviews,
        correctClassifications,
        accuracy,
        meetsTarget: accuracy >= CLASSIFICATION_ACCURACY_TARGET,
      });
    } catch (error: any) {
      logger.error("[classificationAccuracyReport] 리포트 생성 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
