/**
 * 🔥 수익 보호 루프 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 분쟁 반복 계정 → 에스크로 상시
 * - 고위험 상품 → 검수 필수
 * - SLA 초과 → 보상 쿠폰
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";

// 🔥 수익 보호 임계값
const DISPUTE_REPEAT_THRESHOLD = 2; // 분쟁 2회 이상 시 에스크로 상시
const HIGH_RISK_PRODUCT_THRESHOLD = 0.7; // 고위험 상품 임계값 70%
const SLA_EXCEED_COUPON_AMOUNT = 5000; // SLA 초과 보상 쿠폰 5,000원

/**
 * 분쟁 반복 계정 감지 및 에스크로 상시 설정
 */
export const onDisputeRepeatEscrow = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const userId = dispute.userId;

    logger.info("[onDisputeRepeatEscrow] 분쟁 반복 계정 체크:", { disputeId, userId });

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

      // 🔥 분쟁 반복 임계값 초과 시 에스크로 상시 설정
      if (recentDisputes.size >= DISPUTE_REPEAT_THRESHOLD) {
        // 🔥 사용자 문서에 에스크로 상시 플래그 설정
        await db.collection("users").doc(userId).update({
          escrowAlwaysRequired: true,
          escrowAlwaysRequiredAt: FieldValue.serverTimestamp(),
          disputeCount: recentDisputes.size,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 에스크로 상시 설정 로그
        await db.collection("revenueProtectionLogs").add({
          userId,
          action: "ESCROW_ALWAYS_REQUIRED",
          reason: "DISPUTE_REPEAT",
          disputeCount: recentDisputes.size,
          threshold: DISPUTE_REPEAT_THRESHOLD,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onDisputeRepeatEscrow] 에스크로 상시 설정:", {
          userId,
          disputeCount: recentDisputes.size,
          threshold: DISPUTE_REPEAT_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onDisputeRepeatEscrow] 분쟁 반복 계정 체크 실패:", {
        disputeId,
        userId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 고위험 상품 감지 및 검수 필수 설정
 */
export const onHighRiskProductInspection = onDocumentCreated(
  {
    document: "market/{postId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const price = post.price || 0;
    const category = post.category || "";

    logger.info("[onHighRiskProductInspection] 고위험 상품 체크:", { postId, price, category });

    try {
      // 🔥 고위험 상품 판정 조건
      const isHighPrice = price >= 500000; // 50만원 이상
      const isHighRiskCategory = ["전자제품", "명품", "자동차"].includes(category);
      const sellerId = post.userId;

      // 🔥 판매자 평판 조회
      const sellerSnap = await db.collection("users").doc(sellerId).get();
      const seller = sellerSnap.data() as any;
      const sellerReputation = seller?.reputation || 0;
      const sellerTradeCount = seller?.tradeCount || 0;

      // 🔥 고위험 상품 점수 계산
      let riskScore = 0;
      if (isHighPrice) riskScore += 0.3;
      if (isHighRiskCategory) riskScore += 0.2;
      if (sellerReputation < 3.5) riskScore += 0.2;
      if (sellerTradeCount < 5) riskScore += 0.3;

      // 🔥 고위험 상품 임계값 초과 시 검수 필수 설정
      if (riskScore >= HIGH_RISK_PRODUCT_THRESHOLD) {
        await db.collection("market").doc(postId).update({
          inspectionRequired: true,
          inspectionRequiredAt: FieldValue.serverTimestamp(),
          riskScore,
          inspectionStatus: "PENDING",
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 검수 큐에 등록
        await db.collection("inspectionQueue").add({
          postId,
          sellerId,
          price,
          category,
          riskScore,
          reason: "HIGH_RISK_PRODUCT",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        // 🔥 검수 필수 설정 로그
        await db.collection("revenueProtectionLogs").add({
          postId,
          sellerId,
          action: "INSPECTION_REQUIRED",
          reason: "HIGH_RISK_PRODUCT",
          riskScore,
          threshold: HIGH_RISK_PRODUCT_THRESHOLD,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.warn("[onHighRiskProductInspection] 검수 필수 설정:", {
          postId,
          sellerId,
          riskScore,
          threshold: HIGH_RISK_PRODUCT_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onHighRiskProductInspection] 고위험 상품 체크 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * SLA 초과 시 보상 쿠폰 지급
 */
export const onSLAExceedCoupon = onDocumentUpdated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const disputeId = event.params.disputeId;
    const userId = after.userId;

    // 🔥 SLA 초과 감지 (봇 응답 25초 초과 또는 상담원 연결 6분 초과)
    const createdAt = after.createdAt?.toDate();
    const botRespondedAt = after.botRespondedAt?.toDate();
    const agentAssignedAt = after.agentAssignedAt?.toDate();

    if (!createdAt) return;

    let slaExceeded = false;
    let exceedReason = "";

          // 🔥 봇 응답 SLA 초과 (20초)
          if (!botRespondedAt || (botRespondedAt.getTime() - createdAt.getTime()) > 20 * 1000) {
      slaExceeded = true;
      exceedReason = "BOT_RESPONSE_DELAY";
    }

    // 🔥 상담원 연결 SLA 초과 (6분)
    if (!agentAssignedAt || (agentAssignedAt.getTime() - createdAt.getTime()) > 6 * 60 * 1000) {
      slaExceeded = true;
      exceedReason = "AGENT_ASSIGNMENT_DELAY";
    }

    // 🔥 SLA 초과 시 보상 쿠폰 지급 (중복 지급 방지)
    if (slaExceeded && !after.slaExceedCouponIssued) {
      await db.collection("disputes").doc(disputeId).update({
        slaExceedCouponIssued: true,
        slaExceedCouponIssuedAt: FieldValue.serverTimestamp(),
        slaExceedCouponAmount: SLA_EXCEED_COUPON_AMOUNT,
        slaExceedReason: exceedReason,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 사용자에게 보상 쿠폰 안내
      await notify(userId, {
        type: "JOIN_APPROVED", // 임시 타입
        title: "SLA 초과 보상 쿠폰",
        body: `문의 처리 지연으로 인해 ${SLA_EXCEED_COUPON_AMOUNT.toLocaleString()}원 쿠폰이 지급되었습니다.`,
        postId: after.postId || "",
      });

      // 🔥 보상 쿠폰 지급 로그
      await db.collection("revenueProtectionLogs").add({
        disputeId,
        userId,
        action: "SLA_EXCEED_COUPON",
        reason: exceedReason,
        couponAmount: SLA_EXCEED_COUPON_AMOUNT,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info("[onSLAExceedCoupon] SLA 초과 보상 쿠폰 지급:", {
        disputeId,
        userId,
        exceedReason,
        couponAmount: SLA_EXCEED_COUPON_AMOUNT,
      });
    }
  }
);

/**
 * 수익 보호 통계 집계
 */
export const revenueProtectionStatsJob = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[revenueProtectionStatsJob] 수익 보호 통계 집계 시작");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStart = Timestamp.fromDate(yesterday);
      const yesterdayEnd = Timestamp.fromDate(
        new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
      );

      // 🔥 어제 수익 보호 로그 집계
      const logs = await db
        .collection("revenueProtectionLogs")
        .where("createdAt", ">=", yesterdayStart)
        .where("createdAt", "<", yesterdayEnd)
        .get();

      let escrowAlwaysRequiredCount = 0;
      let inspectionRequiredCount = 0;
      let slaExceedCouponCount = 0;
      let totalCouponAmount = 0;

      logs.docs.forEach((doc) => {
        const log = doc.data();
        if (log.action === "ESCROW_ALWAYS_REQUIRED") {
          escrowAlwaysRequiredCount++;
        } else if (log.action === "INSPECTION_REQUIRED") {
          inspectionRequiredCount++;
        } else if (log.action === "SLA_EXCEED_COUPON") {
          slaExceedCouponCount++;
          totalCouponAmount += log.couponAmount || 0;
        }
      });

      // 🔥 통계 저장
      await db.collection("revenueProtectionStats").add({
        date: yesterdayStart,
        escrowAlwaysRequiredCount,
        inspectionRequiredCount,
        slaExceedCouponCount,
        totalCouponAmount,
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info("[revenueProtectionStatsJob] 수익 보호 통계 집계 완료:", {
        date: yesterdayStart.toDate().toISOString(),
        escrowAlwaysRequiredCount,
        inspectionRequiredCount,
        slaExceedCouponCount,
        totalCouponAmount,
      });
    } catch (error: any) {
      logger.error("[revenueProtectionStatsJob] 통계 집계 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
