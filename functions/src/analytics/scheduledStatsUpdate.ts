/**
 * 🔥 Scheduled Stats Update - 주기적 통계 집계
 * 
 * 역할:
 * - 매일 자정: 월별 통계 업데이트
 * - 매주 월요일: 주별 통계 업데이트
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { updateMonthlyStats, updateRecentMonthlyStats } from "./updateMonthlyStats";
import { updateWeeklyStats, updateRecentWeeklyStats } from "./updateWeeklyStats";
import { generateInsights } from "./generateInsights";

/**
 * 매일 자정: 현재 월 통계 업데이트
 */
export const dailyMonthlyStatsUpdate = onSchedule(
  {
    schedule: "0 0 * * *", // 매일 자정
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      logger.info("🔄 [dailyMonthlyStatsUpdate] 일일 월별 통계 업데이트 시작");
      await updateMonthlyStats();
      logger.info("✅ [dailyMonthlyStatsUpdate] 완료");
    } catch (error: any) {
      logger.error("❌ [dailyMonthlyStatsUpdate] 실패:", error.message);
    }
  }
);

/**
 * 매주 월요일 오전 9시: 주별 통계 업데이트
 */
export const weeklyStatsUpdate = onSchedule(
  {
    schedule: "0 9 * * 1", // 매주 월요일 오전 9시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      logger.info("🔄 [weeklyStatsUpdate] 주별 통계 업데이트 시작");
      await updateWeeklyStats();
      logger.info("✅ [weeklyStatsUpdate] 완료");
    } catch (error: any) {
      logger.error("❌ [weeklyStatsUpdate] 실패:", error.message);
    }
  }
);

/**
 * 매월 1일: 최근 12개월 통계 재집계
 */
export const monthlyStatsRecalculation = onSchedule(
  {
    schedule: "0 2 1 * *", // 매월 1일 오전 2시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      logger.info("🔄 [monthlyStatsRecalculation] 최근 12개월 통계 재집계 시작");
      await updateRecentMonthlyStats(12);
      logger.info("✅ [monthlyStatsRecalculation] 완료");
    } catch (error: any) {
      logger.error("❌ [monthlyStatsRecalculation] 실패:", error.message);
    }
  }
);

/**
 * 매주 월요일: 최근 12주 통계 재집계
 */
export const weeklyStatsRecalculation = onSchedule(
  {
    schedule: "0 3 * * 1", // 매주 월요일 오전 3시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      logger.info("🔄 [weeklyStatsRecalculation] 최근 12주 통계 재집계 시작");
      await updateRecentWeeklyStats(12);
      logger.info("✅ [weeklyStatsRecalculation] 완료");
    } catch (error: any) {
      logger.error("❌ [weeklyStatsRecalculation] 실패:", error.message);
    }
  }
);

/**
 * 매일 오전 6시: Insights 생성
 */
export const dailyInsightsGeneration = onSchedule(
  {
    schedule: "0 6 * * *", // 매일 오전 6시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      logger.info("🔄 [dailyInsightsGeneration] 인사이트 생성 시작");
      await generateInsights();
      logger.info("✅ [dailyInsightsGeneration] 완료");
    } catch (error: any) {
      logger.error("❌ [dailyInsightsGeneration] 실패:", error.message);
    }
  }
);
