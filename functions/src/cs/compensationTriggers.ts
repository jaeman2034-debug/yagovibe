/**
 * 🔥 보상 트리거 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 오분류 → 우선 처리
 * - 반복 분쟁 → 중재 개입
 * - 보상 자동 지급
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";

// 🔥 보상 트리거 임계값
const REPEATED_DISPUTE_THRESHOLD = 3; // 반복 분쟁 3회 이상 시 중재 개입

/**
 * 오분류 감지 시 우선 처리
 */
export const onMisclassificationPriority = onDocumentUpdated(
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
        const disputeId = after.disputeId;

        // 🔥 오분류 분쟁을 우선 처리 큐에 등록
        await db.collection("csPriorityQueue").add({
          disputeId,
          priority: "HIGH",
          reason: "MISCLASSIFICATION",
          autoClassifiedType,
          humanReviewedType,
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        // 🔥 분쟁 문서 업데이트
        await db.collection("disputes").doc(disputeId).update({
          priority: "HIGH",
          misclassified: true,
          misclassificationCorrected: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onMisclassificationPriority] 오분류 우선 처리 등록:", {
          reviewId,
          disputeId,
          autoClassifiedType,
          humanReviewedType,
        });
      }
    }
  }
);

/**
 * 반복 분쟁 감지 시 중재 개입
 */
export const onRepeatedDisputeMediation = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const userId = dispute.userId;

    logger.info("[onRepeatedDisputeMediation] 반복 분쟁 체크:", { disputeId, userId });

    try {
      // 🔥 최근 30일 내 동일 사용자 분쟁 조회
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const recentDisputes = await db
        .collection("disputes")
        .where("userId", "==", userId)
        .where("createdAt", ">=", thirtyDaysAgo)
        .get();

      // 🔥 반복 분쟁 임계값 초과 시 중재 개입
      if (recentDisputes.size >= REPEATED_DISPUTE_THRESHOLD) {
        // 🔥 중재 큐에 등록
        await db.collection("mediationQueue").add({
          disputeId,
          userId,
          disputeCount: recentDisputes.size,
          reason: "REPEATED_DISPUTES",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        // 🔥 분쟁 문서 업데이트
        await db.collection("disputes").doc(disputeId).update({
          requiresMediation: true,
          mediationRequested: true,
          mediationRequestedAt: FieldValue.serverTimestamp(),
          priority: "CRITICAL",
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 사용자에게 중재 안내
        await notify(userId, {
          type: "JOIN_APPROVED", // 임시 타입
          title: "중재 개입 안내",
          body: "반복 분쟁으로 인해 중재가 개입되었습니다. 빠른 시일 내에 해결하겠습니다.",
          postId: dispute.postId || "",
        });

        logger.warn("[onRepeatedDisputeMediation] 중재 개입 등록:", {
          disputeId,
          userId,
          disputeCount: recentDisputes.size,
        });
      }
    } catch (error: any) {
      logger.error("[onRepeatedDisputeMediation] 반복 분쟁 체크 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
