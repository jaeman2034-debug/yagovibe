/**
 * 🔥 수익 방어 루프 (완전 안정)
 * 
 * 역할:
 * - 반복 분쟁 계정 → 에스크로 상시
 * - 고위험 카테고리 → 검수 필수
 * - SLA 초과 → 자동 보상
 * - 마진 하락 → 광고 비율 조정
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 수익 방어 루프 임계값 (완전 안정)
const HIGH_RISK_CATEGORY_DISPUTE_RATE = 0.15; // 고위험 카테고리 분쟁률 임계값 15%
const HIGH_RISK_CATEGORY_INSPECTION_THRESHOLD = 0.7; // 고위험 카테고리 검수 임계값 70%
const AD_RATIO_ADJUSTMENT_THRESHOLD = 0.1; // 마진 하락 시 광고 비율 조정 임계값 10%
const PROFIT_MARGIN_TARGET = 4.5; // 수익률 목표 4.5% (4.2% → 4.5%로 상향)

/**
 * 고위험 카테고리 → 검수 필수
 */
export const highRiskCategoryInspectionJob = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[highRiskCategoryInspectionJob] 고위험 카테고리 검수 모니터링 시작");

    try {
      const now = new Date();
      const sevenDaysAgo = Timestamp.fromDate(
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      );

      // 🔥 최근 7일 내 거래 및 분쟁 조회
      const trades = await db
        .collection("trades")
        .where("createdAt", ">=", sevenDaysAgo)
        .get();

      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", sevenDaysAgo)
        .get();

      // 🔥 카테고리별 분쟁률 집계
      const categoryDisputeRates = new Map<string, { trades: number; disputes: number; rate: number }>();

      trades.docs.forEach((doc) => {
        const trade = doc.data();
        const category = trade.category || "기타";

        if (!categoryDisputeRates.has(category)) {
          categoryDisputeRates.set(category, { trades: 0, disputes: 0, rate: 0 });
        }

        const stats = categoryDisputeRates.get(category)!;
        stats.trades++;
      });

      disputes.docs.forEach((doc) => {
        const dispute = doc.data();
        const category = dispute.category || "기타";

        if (categoryDisputeRates.has(category)) {
          const stats = categoryDisputeRates.get(category)!;
          stats.disputes++;
        }
      });

      // 🔥 분쟁률 계산 및 고위험 카테고리 식별
      const highRiskCategories: string[] = [];

      categoryDisputeRates.forEach((stats, category) => {
        stats.rate = stats.trades > 0 ? (stats.disputes / stats.trades) * 100 : 0;

        // 🔥 고위험 카테고리 판단 (분쟁률 15% 이상)
        if (stats.rate >= HIGH_RISK_CATEGORY_DISPUTE_RATE) {
          highRiskCategories.push(category);

          // 🔥 해당 카테고리의 최근 게시글에 검수 필수 설정
          const recentPosts = await db
            .collection("market")
            .where("category", "==", category)
            .where("createdAt", ">=", sevenDaysAgo)
            .get();

          let inspectionRequiredCount = 0;

          for (const postDoc of recentPosts.docs) {
            const post = postDoc.data();
            const postId = postDoc.id;

            if (!post.inspectionRequired) {
              await db.collection("market").doc(postId).update({
                inspectionRequired: true,
                inspectionRequiredAt: FieldValue.serverTimestamp(),
                inspectionReason: "HIGH_RISK_CATEGORY",
                categoryDisputeRate: stats.rate,
                updatedAt: FieldValue.serverTimestamp(),
              });

              // 🔥 검수 큐에 등록
              await db.collection("inspectionQueue").add({
                postId,
                sellerId: post.userId,
                category,
                categoryDisputeRate: stats.rate,
                reason: "HIGH_RISK_CATEGORY",
                createdAt: FieldValue.serverTimestamp(),
                status: "PENDING",
              });

              inspectionRequiredCount++;
            }
          }

          if (inspectionRequiredCount > 0) {
            logger.info("[highRiskCategoryInspectionJob] 고위험 카테고리 검수 요청:", {
              category,
              disputeRate: stats.rate,
              inspectionRequiredCount,
            });
          }
        }
      });

      // 🔥 고위험 카테고리가 있으면 알람
      if (highRiskCategories.length > 0) {
        await db.collection("operationalAlerts").add({
          type: "HIGH_RISK_CATEGORY_ALERT",
          metric: "high_risk_category",
          categories: highRiskCategories,
          threshold: HIGH_RISK_CATEGORY_DISPUTE_RATE,
          severity: "MEDIUM",
          createdAt: FieldValue.serverTimestamp(),
          status: "ACTIVE",
        });

        logger.warn("[highRiskCategoryInspectionJob] 고위험 카테고리 감지:", {
          categories: highRiskCategories,
          threshold: HIGH_RISK_CATEGORY_DISPUTE_RATE,
        });
      }
    } catch (error: any) {
      logger.error("[highRiskCategoryInspectionJob] 고위험 카테고리 검수 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 마진 하락 → 광고 비율 조정
 */
export const marginDropAdRatioAdjustmentJob = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[marginDropAdRatioAdjustmentJob] 마진 하락 광고 비율 조정 모니터링 시작");

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

      // 🔥 마진 하락 체크
      const marginDrop = PROFIT_MARGIN_TARGET - profitMargin;

      if (marginDrop >= AD_RATIO_ADJUSTMENT_THRESHOLD) {
        // 🔥 광고 비율 감소 (10% → 8%)
        const adSettingsSnap = await db.collection("adSettings").doc("global").get();
        const currentRatio = adSettingsSnap.exists && adSettingsSnap.data()?.adRatio
          ? adSettingsSnap.data().adRatio
          : 0.1;

        if (currentRatio >= 0.1) {
          const newRatio = Math.max(0.05, currentRatio - 0.02); // 최소 5%까지 감소

          await db.collection("adSettings").doc("global").set({
            adRatio: newRatio,
            adjustedAt: FieldValue.serverTimestamp(),
            adjustmentReason: "PROFIT_MARGIN_DROP",
            marginDrop,
            previousRatio: currentRatio,
            profitMargin,
            target: PROFIT_MARGIN_TARGET,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          logger.warn("[marginDropAdRatioAdjustmentJob] 광고 비율 조정:", {
            previousRatio: currentRatio,
            newRatio,
            marginDrop,
            profitMargin,
            target: PROFIT_MARGIN_TARGET,
          });
        }
      } else if (profitMargin >= PROFIT_MARGIN_TARGET) {
        // 🔥 수익률 목표 달성 시 광고 비율 복원
        const adSettingsSnap = await db.collection("adSettings").doc("global").get();
        if (adSettingsSnap.exists) {
          const adSettings = adSettingsSnap.data();
          if (adSettings?.adjustedAt && adSettings?.adjustmentReason === "PROFIT_MARGIN_DROP") {
            const restoredRatio = Math.min(0.1, (adSettings.previousRatio || 0.1) + 0.01); // 점진적 복원

            await db.collection("adSettings").doc("global").set({
              adRatio: restoredRatio,
              adjustedAt: FieldValue.serverTimestamp(),
              adjustmentReason: "PROFIT_MARGIN_RECOVERED",
              previousRatio: adSettings.adRatio,
              profitMargin,
              target: PROFIT_MARGIN_TARGET,
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            logger.info("[marginDropAdRatioAdjustmentJob] 광고 비율 복원:", {
              previousRatio: adSettings.adRatio,
              newRatio: restoredRatio,
              profitMargin,
              target: PROFIT_MARGIN_TARGET,
            });
          }
        }
      }
    } catch (error: any) {
      logger.error("[marginDropAdRatioAdjustmentJob] 마진 하락 광고 비율 조정 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
