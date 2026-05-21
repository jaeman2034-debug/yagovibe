/**
 * 🔥 노쇼 체크 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 5분마다 대기 중인 거래 체크
 * - 30분 대기 규칙 적용
 * - 자동 노쇼 처리
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { checkWaitingTime } from "./noShowPrevention";

/**
 * 노쇼 체크 스케줄러 (5분마다 실행)
 */
export const noShowCheckJob = onSchedule(
  {
    schedule: "*/5 * * * *", // 5분마다
    timeZone: "Asia/Seoul",
    retryCount: 1,
  },
  async () => {
    logger.info("[noShowCheckJob] 노쇼 체크 시작");

    try {
      await checkWaitingTime();
      logger.info("[noShowCheckJob] 노쇼 체크 완료");
    } catch (error: any) {
      logger.error("[noShowCheckJob] 노쇼 체크 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
