/**
 * ⏰ QR 로그인 자동 완화 플래그 원복 (Scheduled Function)
 * 
 * 만료된 플래그를 자동으로 원복하는 스케줄 함수
 * 5분마다 실행하여 만료된 플래그를 감지하고 원복
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { resetExpiredMitigationFlags } from "./qrLoginAutoMitigation";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

/**
 * 만료된 플래그 자동 원복 (5분마다)
 */
export const resetExpiredQRLoginMitigationFlags = onSchedule(
  {
    schedule: "*/5 * * * *", // 5분마다
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("⏰ [resetQRLoginMitigationFlags] 만료된 플래그 원복 체크 시작");

    try {
      const reset = await resetExpiredMitigationFlags();
      if (reset) {
        logger.info("✅ [resetQRLoginMitigationFlags] 만료된 플래그 원복 완료");
      } else {
        logger.info("ℹ️ [resetQRLoginMitigationFlags] 원복할 플래그 없음");
      }
    } catch (error: any) {
      logger.error("❌ [resetQRLoginMitigationFlags] 플래그 원복 실패:", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);
