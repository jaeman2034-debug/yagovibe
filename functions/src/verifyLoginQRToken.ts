/**
 * 🔐 로그인용 QR 토큰 검증 및 로그인 처리 Cloud Function
 * 
 * 역할:
 * - QR 토큰 검증 (유효성, 만료, 사용 여부)
 * - 로그인 성공 시 토큰 폐기 (used = true)
 * - 웹 세션 활성화
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface VerifyLoginQRTokenRequest {
  tokenId: string;
  sessionId: string; // 웹 세션 ID (검증용)
  userId: string; // 모바일 앱에서 로그인한 사용자 ID
}

interface VerifyLoginQRTokenResponse {
  success: boolean;
  sessionId: string;
  message?: string;
}

export const verifyLoginQRToken = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<VerifyLoginQRTokenResponse> => {
    const { auth, data } = request;

    // 🔥 모바일 앱에서 호출하므로 인증 필수
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!data || !data.tokenId || !data.sessionId || !data.userId) {
      throw new HttpsError("invalid-argument", "tokenId, sessionId, and userId are required");
    }

    const { tokenId, sessionId, userId } = data as VerifyLoginQRTokenRequest;

    // 1️⃣ 토큰 조회
    const tokenRef = db.collection("loginQRTokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      logger.warn("⚠️ [verifyLoginQRToken] 토큰 없음", { tokenId });
      return {
        success: false,
        sessionId,
        message: "유효하지 않은 QR 코드입니다.",
      };
    }

    const tokenData = tokenSnap.data()!;

    // 2️⃣ 세션 ID 검증 (웹 세션과 일치하는지 확인)
    if (tokenData.sessionId !== sessionId) {
      logger.warn("⚠️ [verifyLoginQRToken] 세션 ID 불일치", {
        tokenId,
        expected: tokenData.sessionId,
        received: sessionId,
      });
      return {
        success: false,
        sessionId,
        message: "QR 코드가 다른 세션에 연결되어 있습니다.",
      };
    }

    // 3️⃣ 만료 확인
    const expiresAt = tokenData.expiresAt?.toDate();
    if (!expiresAt || expiresAt < new Date()) {
      logger.warn("⚠️ [verifyLoginQRToken] 토큰 만료", {
        tokenId,
        expiresAt: expiresAt?.toISOString(),
      });
      return {
        success: false,
        sessionId,
        message: "QR 코드가 만료되었습니다.",
      };
    }

    // 4️⃣ 사용 여부 확인 (1회용 처리)
    if (tokenData.used === true) {
      logger.warn("⚠️ [verifyLoginQRToken] 이미 사용된 토큰", { tokenId });
      return {
        success: false,
        sessionId,
        message: "이미 사용된 QR 코드입니다.",
      };
    }

    // 5️⃣ 사용자 ID 검증 (모바일 앱에서 로그인한 사용자)
    if (auth.uid !== userId) {
      throw new HttpsError("permission-denied", "User ID mismatch");
    }

    // 6️⃣ 토큰 폐기 (used = true로 설정)
    await tokenRef.update({
      used: true,
      usedAt: Timestamp.now(),
      usedBy: userId,
    });

    // 7️⃣ 웹 세션 활성화 (세션 문서에 로그인 정보 저장)
    const sessionRef = db.collection("webSessions").doc(sessionId);
    await sessionRef.set(
      {
        userId,
        loggedInAt: Timestamp.now(),
        qrTokenId: tokenId,
        status: "authenticated",
      },
      { merge: true }
    );

    logger.info("✅ [verifyLoginQRToken] 로그인 성공", {
      tokenId,
      sessionId,
      userId,
    });

    return {
      success: true,
      sessionId,
    };
  }
);
