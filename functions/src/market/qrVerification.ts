/**
 * 🔥 QR 코드 상호 인증 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - QR 코드 생성
 * - QR 코드 스캔 및 상호 인증
 * - 거래 활성화
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { generateQRCode, verifyQRCode } from "./offlineVerification";

/**
 * QR 코드 생성 Cloud Function
 */
export const generateQRCodeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { tradeId } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!tradeId) {
      throw new HttpsError("invalid-argument", "tradeId가 필요합니다.");
    }

    try {
      logger.info("[generateQRCode] QR 코드 생성 요청:", {
        userId,
        tradeId,
      });

      const qrData = await generateQRCode(tradeId, userId);

      return {
        success: true,
        qrData,
      };
    } catch (error: any) {
      logger.error("[generateQRCode] QR 코드 생성 실패:", {
        userId,
        tradeId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "QR 코드 생성 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);

/**
 * QR 코드 스캔 및 인증 Cloud Function
 */
export const verifyQRCodeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { qrId } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!qrId) {
      throw new HttpsError("invalid-argument", "qrId가 필요합니다.");
    }

    try {
      logger.info("[verifyQRCode] QR 코드 인증 요청:", {
        userId,
        qrId,
      });

      const result = await verifyQRCode(qrId, userId);

      return {
        success: true,
        verified: result.verified,
        tradeId: result.tradeId,
      };
    } catch (error: any) {
      logger.error("[verifyQRCode] QR 코드 인증 실패:", {
        userId,
        qrId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "QR 코드 인증 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
