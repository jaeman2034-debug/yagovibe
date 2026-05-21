/**
 * 월간 리포트 자동 스케줄러
 * 
 * 매월 1일 오전 9시에 협회 운영 리포트 PDF를 자동 생성
 * Cloud Scheduler + Pub/Sub 트리거
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { generateMonthlyReportInternal } from "../services/monthlyReportService";
import { sendMonthlyReportEmail } from "../services/associationReportMailer";

/**
 * 월간 리포트 자동 생성 스케줄러
 * 
 * 크론 표현식: 0 9 1 * * (매월 1일 오전 9시)
 * 타임존: Asia/Seoul
 * 
 * 지난달 리포트를 생성합니다 (예: 2월 1일 → 1월 리포트)
 */
export const monthlyReportScheduler = onSchedule(
  {
    schedule: "0 9 1 * *", // 매월 1일 오전 9시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 300, // 5분 타임아웃
  },
  async (event) => {
    logger.info("📅 Monthly report scheduler triggered", {
      scheduleTime: event.scheduleTime,
    });

    try {
      // 현재 날짜 기준 지난달 계산
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      // 협회 ID 목록 (현재는 노원구축구협회만, 추후 확장 가능)
      const associationIds = ["assoc-nowon-football"];

      // 각 협회에 대해 리포트 생성
      const results = await Promise.allSettled(
        associationIds.map(async (associationId) => {
          logger.info(`📊 Generating monthly report for ${associationId}`, {
            year,
            month,
          });

          // 1. PDF 리포트 생성
          const result = await generateMonthlyReportInternal({
            associationId,
            year,
            month,
          });

          logger.info(`✅ Monthly report generated successfully`, {
            associationId,
            year,
            month,
            storageKey: result.storageKey,
          });

          // 2. 협회 정보 조회 (이름)
          const associationDoc = await admin.firestore().doc(`associations/${associationId}`).get();
          const associationName = associationDoc.data()?.name || "협회";

          // 3. 이메일 발송
          try {
            await sendMonthlyReportEmail({
              associationId,
              associationName,
              year,
              month,
              pdfUrl: result.pdfUrl,
            });
            logger.info(`✅ Monthly report email sent successfully`, {
              associationId,
              year,
              month,
            });
          } catch (emailError: any) {
            // 이메일 발송 실패는 로그만 남기고 계속 진행
            logger.error(`⚠️ Monthly report email failed (non-blocking): ${emailError.message}`, {
              associationId,
              year,
              month,
            });
          }

          return result;
        })
      );

      // 결과 로깅
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      logger.info(`📊 Monthly report scheduler completed`, {
        total: associationIds.length,
        successful,
        failed,
        year,
        month,
      });

      // 실패한 경우 에러 로깅
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          logger.error(`❌ Failed to generate report for ${associationIds[index]}`, {
            error: result.reason,
            year,
            month,
          });
        }
      });
    } catch (error: any) {
      logger.error(`❌ Monthly report scheduler error: ${error}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);

