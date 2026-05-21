/**
 * 🔥 만남 체크인 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - GPS 위치 확인
 * - 거래 장소와의 거리 체크
 * - 체크인 기록
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { meetCheckIn, setMeetingPlace } from "./offlineVerification";

/**
 * 만남 체크인 Cloud Function
 */
export const meetCheckInCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { tradeId, location, meetingPlace } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!tradeId || !location) {
      throw new HttpsError(
        "invalid-argument",
        "tradeId와 location이 필요합니다."
      );
    }

    try {
      logger.info("[meetCheckIn] 체크인 요청:", {
        userId,
        tradeId,
        location,
      });

      const result = await meetCheckIn(
        tradeId,
        userId,
        location,
        meetingPlace
      );

      return {
        success: true,
        verified: result.verified,
        distance: result.distance,
      };
    } catch (error: any) {
      logger.error("[meetCheckIn] 체크인 실패:", {
        userId,
        tradeId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "체크인 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * 거래 장소 설정 Cloud Function
 */
export const setMeetingPlaceCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { tradeId, location, placeName } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!tradeId || !location) {
      throw new HttpsError(
        "invalid-argument",
        "tradeId와 location이 필요합니다."
      );
    }

    try {
      logger.info("[setMeetingPlace] 거래 장소 설정:", {
        userId,
        tradeId,
        location,
        placeName,
      });

      await setMeetingPlace(tradeId, userId, location, placeName);

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("[setMeetingPlace] 거래 장소 설정 실패:", {
        userId,
        tradeId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "거래 장소 설정 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
