/**
 * 🔥 광고 클릭 기록 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 광고 클릭 기록
 * - CPC 과금 처리
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { recordClick } from "./ads";

/**
 * 광고 클릭 기록 Cloud Function
 */
export const recordAdClick = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { adId } = request.data;

    if (!adId) {
      throw new HttpsError("invalid-argument", "adId가 필요합니다.");
    }

    try {
      logger.info("[recordAdClick] 광고 클릭 기록:", { adId, userId });

      await recordClick(adId, userId);

      return {
        success: true,
        adId,
      };
    } catch (error: any) {
      logger.error("[recordAdClick] 클릭 기록 실패:", {
        adId,
        userId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "클릭 기록 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
