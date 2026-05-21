/**
 * 🔥 비용 최적화 루프 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 반복 문의 → FAQ 학습
 * - 오분류 → 룰 보정
 * - 고위험 → 우선 큐
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 비용 최적화 임계값 (완전 운영)
const FAQ_LEARNING_THRESHOLD = 3; // 동일 문의 3회 이상 시 FAQ 학습
const RULE_CORRECTION_THRESHOLD = 0.004; // 오분류 0.4% 이상 시 룰 보정 (0.5% → 0.4%로 강화)

/**
 * 반복 문의 감지 및 FAQ 학습
 */
export const onRepeatedInquiryFAQ = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const title = dispute.title || "";
    const description = dispute.description || "";

    logger.info("[onRepeatedInquiryFAQ] 반복 문의 체크:", { disputeId });

    try {
      // 🔥 최근 30일 내 동일/유사 문의 조회
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const similarInquiries = await db
        .collection("disputes")
        .where("createdAt", ">=", thirtyDaysAgo)
        .limit(100)
        .get();

      // 🔥 제목/내용 유사도 계산
      const text = `${title} ${description}`.toLowerCase();
      let similarCount = 0;

      for (const doc of similarInquiries.docs) {
        if (doc.id === disputeId) continue;

        const existingDispute = doc.data();
        const existingText = `${existingDispute.title || ""} ${existingDispute.description || ""}`.toLowerCase();

        // 🔥 단어 기반 유사도 계산
        const words1 = new Set(text.split(/\s+/));
        const words2 = new Set(existingText.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const similarity = intersection.size / union.size;

        if (similarity >= 0.7) {
          similarCount++;
        }
      }

      // 🔥 반복 문의 임계값 초과 시 FAQ 학습
      if (similarCount >= FAQ_LEARNING_THRESHOLD) {
        await db.collection("faqLearningQueue").add({
          disputeId,
          title,
          description,
          similarCount,
          reason: "REPEATED_INQUIRY",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onRepeatedInquiryFAQ] FAQ 학습 요청 등록:", {
          disputeId,
          similarCount,
          threshold: FAQ_LEARNING_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onRepeatedInquiryFAQ] 반복 문의 체크 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 오분류 감지 시 룰 보정
 */
export const onMisclassificationRuleCorrection = onDocumentUpdated(
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
        logger.warn("[onMisclassificationRuleCorrection] 오분류 감지:", {
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

          // 🔥 오분류 1.5% 이상 시 룰 보정 요청
          if (newMisclassificationRate >= RULE_CORRECTION_THRESHOLD) {
            await db.collection("ruleCorrectionQueue").add({
              triggeredAt: FieldValue.serverTimestamp(),
              misclassificationRate: newMisclassificationRate,
              threshold: RULE_CORRECTION_THRESHOLD,
              reason: "MISCLASSIFICATION_ABOVE_THRESHOLD",
              autoClassifiedType,
              humanReviewedType,
              status: "PENDING",
            });

            logger.warn("[onMisclassificationRuleCorrection] 룰 보정 요청 등록:", {
              misclassificationRate: newMisclassificationRate,
              threshold: RULE_CORRECTION_THRESHOLD,
            });
          }
        });
      }
    }
  }
);

/**
 * 고위험 분쟁 우선 큐 등록
 */
export const onHighRiskPriorityQueue = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const priority = dispute.priority || "MEDIUM";
    const type = dispute.type || "OTHER";

    // 🔥 고위험 분쟁 체크
    const isHighRisk = priority === "CRITICAL" || priority === "HIGH" || 
                       type === "FRAUD" || type === "ACCOUNT_ABUSE";

    if (isHighRisk) {
      await db.collection("csPriorityQueue").add({
        disputeId,
        priority: "HIGH",
        type,
        reason: "HIGH_RISK",
        createdAt: FieldValue.serverTimestamp(),
        status: "PENDING",
      });

      logger.info("[onHighRiskPriorityQueue] 고위험 분쟁 우선 큐 등록:", {
        disputeId,
        priority,
        type,
      });
    }
  }
);
