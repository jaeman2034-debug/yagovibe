/**
 * 📊 QR 로그인 기준선 튜닝 결과 조회 (Callable Function)
 * 
 * 관리자가 최근 데이터를 기반으로 추천 임계치를 조회할 수 있는 API
 */

import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { calculateThresholds, TuningResult } from "./qrLoginAlertTuning";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

/**
 * QR 로그인 기준선 튜닝 결과 조회
 * 
 * @param hoursBack 분석 기간 (시간) - 기본 48시간
 * @param peakHours 피크 시간대 (시간 배열) - 기본 [12, 13, 14, 18, 19, 20, 21]
 */
export const getQRLoginTuningResult = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    try {
      const hoursBack = request.data?.hoursBack || 48;
      const peakHours = request.data?.peakHours || [12, 13, 14, 18, 19, 20, 21];

      logger.info("📊 [getQRLoginTuningResult] 기준선 계산 요청:", {
        hoursBack,
        peakHours,
        uid: request.auth?.uid,
      });

      // 권한 체크 (관리자만 접근 가능)
      // TODO: 실제 권한 체크 로직 추가
      // if (!isAdmin(request.auth?.uid)) {
      //   throw new HttpsError("permission-denied", "관리자만 접근 가능합니다.");
      // }

      const result = await calculateThresholds(hoursBack, peakHours);

      logger.info("✅ [getQRLoginTuningResult] 기준선 계산 완료:", {
        recommendedSuccessRate: result.successRate.recommended,
        recommendedSmsFailureRate: result.smsFailureRate.recommended,
        recommendedLoginTime: result.loginTime.recommended,
        recommendedExpirationRate: result.expirationRate.recommended,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error("❌ [getQRLoginTuningResult] 기준선 계산 실패:", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
);
