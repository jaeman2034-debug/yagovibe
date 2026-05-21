/**
 * 🔐 QR 로그인용 Custom Token 생성 Cloud Function
 * 
 * 역할:
 * - QR 세션의 userId로 Custom Token 발급
 * - PC에서 signInWithCustomToken으로 자동 로그인
 */

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps } from "firebase-admin/app";

// 🔥 Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * QR 세션의 userId로 Custom Token 생성
 */
export const createCustomTokenForQR = onCall(
  {
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const { sessionId } = request.data;

    if (!sessionId || typeof sessionId !== "string") {
      logger.error("❌ [createCustomTokenForQR] sessionId가 없거나 유효하지 않음");
      throw new Error("sessionId is required");
    }

    try {
      logger.info("🔐 [createCustomTokenForQR] 세션 확인 시작:", sessionId);

      // QR 세션 조회
      const sessionRef = db.collection("qrSessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        logger.error("❌ [createCustomTokenForQR] 세션을 찾을 수 없음:", sessionId);
        throw new Error("Session not found");
      }

      const sessionData = sessionDoc.data();
      
      // 세션 상태 확인
      if (sessionData?.status !== "verified") {
        logger.error("❌ [createCustomTokenForQR] 세션이 아직 인증되지 않음:", {
          sessionId,
          status: sessionData?.status,
        });
        throw new Error("Session not verified");
      }

      // userId 확인
      if (!sessionData?.userId || typeof sessionData.userId !== "string") {
        logger.error("❌ [createCustomTokenForQR] userId가 없음:", sessionId);
        throw new Error("UserId not found in session");
      }

      const userId = sessionData.userId;

      logger.info("✅ [createCustomTokenForQR] Custom Token 생성 시작:", userId);

      // Custom Token 생성
      const customToken = await auth.createCustomToken(userId, {
        sessionId,
        loginMethod: "qr_phone",
      });

      logger.info("✅ [createCustomTokenForQR] Custom Token 생성 완료:", {
        userId,
        sessionId,
      });

      // 🔥 보안: 토큰 발급 후 세션 삭제 (1회용 보장)
      await sessionRef.delete();
      logger.info("🔐 [createCustomTokenForQR] 세션 삭제 완료 (1회용 보장)");

      return {
        success: true,
        customToken,
      };
    } catch (error: any) {
      logger.error("❌ [createCustomTokenForQR] 오류:", {
        sessionId,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(error.message || "Failed to create custom token");
    }
  }
);
