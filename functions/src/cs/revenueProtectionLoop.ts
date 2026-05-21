/**
 * 🔥 매출 보호 루프 (완결)
 * 
 * 역할:
 * - 고위험 상품 → 검수 필수
 * - 반복 분쟁 계정 → 에스크로 상시
 * - SLA 초과 → 자동 보상
 * - 수익률 3.5% 목표 달성
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 수익 방어 루프 임계값 (완전 안정)
const PROFIT_MARGIN_TARGET = 4.5; // 수익률 목표 4.5% (4.2% → 4.5%로 상향)
const HIGH_RISK_PRODUCT_INSPECTION_THRESHOLD = 0.7; // 고위험 상품 검수 임계값 70%
const REPEATED_DISPUTE_ACCOUNT_THRESHOLD = 2; // 반복 분쟁 계정 임계값 2회
const SLA_EXCEED_COMPENSATION_AMOUNT = 5000; // SLA 초과 보상 금액 5,000원
const AD_RATIO_ADJUSTMENT_THRESHOLD = 0.1; // 마진 하락 시 광고 비율 조정 임계값 10%

/**
 * 고위험 상품 → 검수 필수
 */
export const highRiskProductInspectionJob = onSchedule(
  { schedule: "*/30 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[highRiskProductInspectionJob] 고위험 상품 검수 모니터링 시작");

    try {
      const now = new Date();
      const oneDayAgo = Timestamp.fromDate(
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
      );

      // 🔥 최근 24시간 내 게시글 조회
      const posts = await db
        .collection("market")
        .where("createdAt", ">=", oneDayAgo)
        .get();

      let inspectionRequiredCount = 0;

      for (const postDoc of posts.docs) {
        const post = postDoc.data();
        const postId = postDoc.id;

        // 🔥 고위험 상품 판단 기준
        const isHighRisk =
          (post.priceAnomalyScore || 0) >= HIGH_RISK_PRODUCT_INSPECTION_THRESHOLD ||
          (post.disputeRiskScore || 0) >= HIGH_RISK_PRODUCT_INSPECTION_THRESHOLD ||
          (post.reputationScore || 0) < 0.3 ||
          !post.faceToFaceVerified ||
          !post.realNameVerified;

        if (isHighRisk && !post.inspectionRequired) {
          await db.collection("market").doc(postId).update({
            inspectionRequired: true,
            inspectionRequiredAt: FieldValue.serverTimestamp(),
            inspectionReason: "HIGH_RISK_PRODUCT",
            riskScore: Math.max(
              post.priceAnomalyScore || 0,
              post.disputeRiskScore || 0
            ),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // 🔥 검수 큐에 등록
          await db.collection("inspectionQueue").add({
            postId,
            sellerId: post.userId,
            category: post.category,
            riskScore: Math.max(
              post.priceAnomalyScore || 0,
              post.disputeRiskScore || 0
            ),
            reason: "HIGH_RISK_PRODUCT",
            createdAt: FieldValue.serverTimestamp(),
            status: "PENDING",
          });

          inspectionRequiredCount++;
        }
      }

      if (inspectionRequiredCount > 0) {
        logger.info("[highRiskProductInspectionJob] 고위험 상품 검수 요청:", {
          inspectionRequiredCount,
        });
      }
    } catch (error: any) {
      logger.error("[highRiskProductInspectionJob] 고위험 상품 검수 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 반복 분쟁 계정 → 에스크로 상시
 */
export const repeatedDisputeAccountEscrowJob = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[repeatedDisputeAccountEscrowJob] 반복 분쟁 계정 에스크로 모니터링 시작");

    try {
      const now = new Date();
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      );

      // 🔥 최근 30일 내 분쟁 조회
      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", thirtyDaysAgo)
        .get();

      // 🔥 사용자별 분쟁 횟수 집계
      const userDisputeCounts = new Map<string, number>();

      disputes.docs.forEach((doc) => {
        const dispute = doc.data();
        const userId = dispute.userId || dispute.sellerId || dispute.buyerId;

        if (userId) {
          userDisputeCounts.set(userId, (userDisputeCounts.get(userId) || 0) + 1);
        }
      });

      // 🔥 반복 분쟁 계정 식별 및 에스크로 상시 설정
      let escrowRequiredCount = 0;

      for (const [userId, disputeCount] of userDisputeCounts.entries()) {
        if (disputeCount >= REPEATED_DISPUTE_ACCOUNT_THRESHOLD) {
          const userRef = db.collection("users").doc(userId);
          const userSnap = await userRef.get();

          if (userSnap.exists) {
            const user = userSnap.data();

            // 🔥 에스크로 상시 설정이 없으면 설정
            if (!user?.escrowAlwaysRequired) {
              await userRef.update({
                escrowAlwaysRequired: true,
                escrowAlwaysRequiredAt: FieldValue.serverTimestamp(),
                escrowAlwaysRequiredReason: "REPEATED_DISPUTE",
                disputeCount,
                updatedAt: FieldValue.serverTimestamp(),
              });

              escrowRequiredCount++;
            }
          }
        }
      }

      if (escrowRequiredCount > 0) {
        logger.info("[repeatedDisputeAccountEscrowJob] 반복 분쟁 계정 에스크로 상시 설정:", {
          escrowRequiredCount,
        });
      }
    } catch (error: any) {
      logger.error("[repeatedDisputeAccountEscrowJob] 반복 분쟁 계정 에스크로 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * SLA 초과 → 자동 보상
 */
export const slaExceedCompensationJob = onSchedule(
  { schedule: "*/10 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[slaExceedCompensationJob] SLA 초과 자동 보상 모니터링 시작");

    try {
      const now = new Date();
      const oneHourAgo = Timestamp.fromDate(
        new Date(now.getTime() - 60 * 60 * 1000)
      );

      // 🔥 최근 1시간 내 분쟁 조회
      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", oneHourAgo)
        .where("slaExceedCompensationIssued", "!=", true)
        .get();

      let compensationIssuedCount = 0;

      for (const doc of disputes.docs) {
        const dispute = doc.data();
        const disputeId = doc.id;
        const createdAt = dispute.createdAt?.toDate();
        const botRespondedAt = dispute.botRespondedAt?.toDate();

        if (createdAt) {
          const elapsedSeconds = botRespondedAt
            ? (botRespondedAt.getTime() - createdAt.getTime()) / 1000
            : (now.getTime() - createdAt.getTime()) / 1000;

          // 🔥 SLA 15초 초과 체크 (18초 → 15초로 강화)
          if (elapsedSeconds > 15) {
            const userId = dispute.userId || dispute.buyerId;

            if (userId) {
              await db.collection("disputes").doc(disputeId).update({
                slaExceedCompensationIssued: true,
                slaExceedCompensationIssuedAt: FieldValue.serverTimestamp(),
                slaExceedCompensationAmount: SLA_EXCEED_COMPENSATION_AMOUNT,
                slaExceedElapsedSeconds: elapsedSeconds,
                updatedAt: FieldValue.serverTimestamp(),
              });

              // 🔥 사용자에게 보상 쿠폰 안내
              await db.collection("notifications").doc(userId).collection("items").add({
                type: "SLA_EXCEED_COMPENSATION",
                title: "SLA 초과 보상 쿠폰",
                body: `문의 처리 지연으로 인해 ${SLA_EXCEED_COMPENSATION_AMOUNT.toLocaleString()}원 쿠폰이 지급되었습니다.`,
                disputeId,
                read: false,
                createdAt: FieldValue.serverTimestamp(),
              });

              compensationIssuedCount++;
            }
          }
        }
      }

      if (compensationIssuedCount > 0) {
        logger.info("[slaExceedCompensationJob] SLA 초과 자동 보상 지급:", {
          compensationIssuedCount,
        });
      }
    } catch (error: any) {
      logger.error("[slaExceedCompensationJob] SLA 초과 자동 보상 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 수익률 3.5% 목표 달성 모니터링
 */
export const profitMarginMonitoringJob = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[profitMarginMonitoringJob] 수익률 모니터링 시작");

    try {
      const now = new Date();
      const oneDayAgo = Timestamp.fromDate(
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
      );

      // 🔥 최근 24시간 내 거래 조회
      const trades = await db
        .collection("trades")
        .where("createdAt", ">=", oneDayAgo)
        .where("status", "==", "CONFIRMED")
        .get();

      let totalRevenue = 0;
      let totalCost = 0;

      trades.docs.forEach((doc) => {
        const trade = doc.data();
        const amount = trade.amount || 0;
        const commission = trade.commission || 0;
        const refundAmount = trade.refundAmount || 0;
        const compensationAmount = trade.compensationAmount || 0;

        // 🔥 수익 = 수수료
        totalRevenue += commission;

        // 🔥 비용 = 환불 + 보상
        totalCost += refundAmount + compensationAmount;
      });

      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      // 🔥 수익률 목표 달성 여부 확인
      const isTargetAchieved = profitMargin >= PROFIT_MARGIN_TARGET;

      // 🔥 수익률 통계 저장
      await db.collection("profitMarginStats").add({
        date: Timestamp.fromDate(new Date(now.setHours(0, 0, 0, 0))),
        totalRevenue,
        totalCost,
        profit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        target: PROFIT_MARGIN_TARGET,
        isTargetAchieved,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 🔥 수익률 목표 미달 시 알람
      if (!isTargetAchieved) {
        await db.collection("operationalAlerts").add({
          type: "PROFIT_MARGIN_ALERT",
          metric: "profit_margin",
          value: profitMargin,
          target: PROFIT_MARGIN_TARGET,
          totalRevenue,
          totalCost,
          profit,
          severity: "HIGH",
          createdAt: FieldValue.serverTimestamp(),
          status: "ACTIVE",
        });

        logger.warn("[profitMarginMonitoringJob] 수익률 목표 미달:", {
          profitMargin,
          target: PROFIT_MARGIN_TARGET,
          totalRevenue,
          totalCost,
          profit,
        });
      } else {
        logger.info("[profitMarginMonitoringJob] 수익률 목표 달성:", {
          profitMargin,
          target: PROFIT_MARGIN_TARGET,
          totalRevenue,
          totalCost,
          profit,
        });
      }
    } catch (error: any) {
      logger.error("[profitMarginMonitoringJob] 수익률 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
