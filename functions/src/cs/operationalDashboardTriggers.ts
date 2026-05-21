/**
 * 🔥 운영 대시보드 트리거 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 분쟁률 0.3%↑ → 경고
 * - SLA 20초 초과 → 알람
 * - 특정 카테고리 급등 → 검수
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 운영 대시보드 트리거 임계값 (완전 안정)
const DISPUTE_RATE_WARNING_THRESHOLD = 0.15; // 분쟁률 0.15% 이상 시 경고 (0.18% → 0.15%로 강화)
const SLA_EXCEED_ALERT_THRESHOLD = 15; // SLA 15초 초과 시 알람 (18초 → 15초로 강화)
const CATEGORY_SURGE_THRESHOLD = 2.0; // 카테고리 급등 임계값 (2배 이상)

/**
 * 분쟁률 모니터링 및 경고
 */
export const disputeRateWarningJob = onSchedule(
  { schedule: "*/10 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[disputeRateWarningJob] 분쟁률 모니터링 시작");

    try {
      const now = new Date();
      const oneHourAgo = Timestamp.fromDate(
        new Date(now.getTime() - 60 * 60 * 1000)
      );

      // 🔥 최근 1시간 내 거래 조회
      const trades = await db
        .collection("trades")
        .where("createdAt", ">=", oneHourAgo)
        .get();

      // 🔥 최근 1시간 내 분쟁 조회
      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", oneHourAgo)
        .get();

      const totalTrades = trades.size;
      const totalDisputes = disputes.size;
      const disputeRate = totalTrades > 0 ? (totalDisputes / totalTrades) * 100 : 0;

      // 🔥 분쟁률 임계값 초과 시 경고
      if (disputeRate >= DISPUTE_RATE_WARNING_THRESHOLD) {
        await db.collection("operationalAlerts").add({
          type: "DISPUTE_RATE_WARNING",
          metric: "dispute_rate",
          value: disputeRate,
          threshold: DISPUTE_RATE_WARNING_THRESHOLD,
          totalTrades,
          totalDisputes,
          severity: "WARNING",
          createdAt: FieldValue.serverTimestamp(),
          status: "ACTIVE",
        });

        logger.warn("[disputeRateWarningJob] 분쟁률 경고 발생:", {
          disputeRate,
          threshold: DISPUTE_RATE_WARNING_THRESHOLD,
          totalTrades,
          totalDisputes,
        });
      }
    } catch (error: any) {
      logger.error("[disputeRateWarningJob] 분쟁률 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * SLA 초과 알람
 */
export const slaExceedAlertJob = onSchedule(
  { schedule: "*/5 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[slaExceedAlertJob] SLA 초과 모니터링 시작");

    try {
      const now = new Date();
      const fiveMinutesAgo = Timestamp.fromDate(
        new Date(now.getTime() - 5 * 60 * 1000)
      );

      // 🔥 최근 5분 내 분쟁 조회
      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", fiveMinutesAgo)
        .where("botResponded", "!=", true)
        .get();

      let slaExceededCount = 0;

      disputes.docs.forEach((doc) => {
        const dispute = doc.data();
        const createdAt = dispute.createdAt?.toDate();

        if (createdAt) {
          const elapsedSeconds = (now.getTime() - createdAt.getTime()) / 1000;

          // 🔥 SLA 15초 초과 체크 (18초 → 15초로 강화)
          if (elapsedSeconds > SLA_EXCEED_ALERT_THRESHOLD) {
            slaExceededCount++;
          }
        }
      });

      // 🔥 SLA 초과 분쟁이 있으면 알람 (18초 기준)
      if (slaExceededCount > 0) {
        await db.collection("operationalAlerts").add({
          type: "SLA_EXCEED_ALERT",
          metric: "sla_exceed_count",
          value: slaExceededCount,
          threshold: SLA_EXCEED_ALERT_THRESHOLD,
          severity: "HIGH",
          createdAt: FieldValue.serverTimestamp(),
          status: "ACTIVE",
        });

        logger.warn("[slaExceedAlertJob] SLA 초과 알람 발생:", {
          slaExceededCount,
          threshold: SLA_EXCEED_ALERT_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[slaExceedAlertJob] SLA 초과 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 특정 카테고리 급등 감지 및 검수
 */
export const categorySurgeInspectionJob = onSchedule(
  { schedule: "0 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[categorySurgeInspectionJob] 카테고리 급등 모니터링 시작");

    try {
      const now = new Date();
      const oneHourAgo = Timestamp.fromDate(
        new Date(now.getTime() - 60 * 60 * 1000)
      );
      const oneDayAgo = Timestamp.fromDate(
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
      );

      // 🔥 최근 1시간 내 게시글 조회
      const recentPosts = await db
        .collection("market")
        .where("createdAt", ">=", oneHourAgo)
        .get();

      // 🔥 최근 24시간 내 게시글 조회 (비교 기준)
      const dailyPosts = await db
        .collection("market")
        .where("createdAt", ">=", oneDayAgo)
        .get();

      // 🔥 카테고리별 집계
      const recentCategoryCounts = new Map<string, number>();
      const dailyCategoryCounts = new Map<string, number>();

      recentPosts.docs.forEach((doc) => {
        const category = doc.data().category || "기타";
        recentCategoryCounts.set(category, (recentCategoryCounts.get(category) || 0) + 1);
      });

      dailyPosts.docs.forEach((doc) => {
        const category = doc.data().category || "기타";
        dailyCategoryCounts.set(category, (dailyCategoryCounts.get(category) || 0) + 1);
      });

      // 🔥 카테고리 급등 감지
      const surgedCategories: string[] = [];

      recentCategoryCounts.forEach((recentCount, category) => {
        const dailyCount = dailyCategoryCounts.get(category) || 0;
        const hourlyAverage = dailyCount / 24; // 시간당 평균

        if (hourlyAverage > 0) {
          const surgeRatio = recentCount / hourlyAverage;

          // 🔥 급등 임계값 초과 시 검수 요청
          if (surgeRatio >= CATEGORY_SURGE_THRESHOLD) {
            surgedCategories.push(category);

            // 🔥 해당 카테고리의 최근 게시글에 검수 필수 설정
            recentPosts.docs.forEach((doc) => {
              const post = doc.data();
              if (post.category === category && !post.inspectionRequired) {
                db.collection("market").doc(doc.id).update({
                  inspectionRequired: true,
                  inspectionRequiredAt: FieldValue.serverTimestamp(),
                  inspectionReason: "CATEGORY_SURGE",
                  surgeRatio,
                  updatedAt: FieldValue.serverTimestamp(),
                });

                // 🔥 검수 큐에 등록
                db.collection("inspectionQueue").add({
                  postId: doc.id,
                  sellerId: post.userId,
                  category,
                  surgeRatio,
                  reason: "CATEGORY_SURGE",
                  createdAt: FieldValue.serverTimestamp(),
                  status: "PENDING",
                });
              }
            });
          }
        }
      });

      // 🔥 급등 카테고리가 있으면 알람
      if (surgedCategories.length > 0) {
        await db.collection("operationalAlerts").add({
          type: "CATEGORY_SURGE_ALERT",
          metric: "category_surge",
          categories: surgedCategories,
          threshold: CATEGORY_SURGE_THRESHOLD,
          severity: "MEDIUM",
          createdAt: FieldValue.serverTimestamp(),
          status: "ACTIVE",
        });

        logger.warn("[categorySurgeInspectionJob] 카테고리 급등 감지:", {
          categories: surgedCategories,
          threshold: CATEGORY_SURGE_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[categorySurgeInspectionJob] 카테고리 급등 모니터링 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
