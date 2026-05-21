/**
 * 🔐 로그인용 QR 토큰 생성 Cloud Function
 * 
 * 역할:
 * - 웹 세션에 1:1 바인딩된 로그인 QR 토큰 생성
 * - 1회용 처리 (첫 로그인 성공 시 즉시 폐기)
 * - 2~5분 만료
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = getFirestore();

interface GenerateLoginQRTokenRequest {
  sessionId: string; // 웹 세션 ID (클라이언트에서 생성)
  expiresInMinutes?: number; // 만료 시간 (분, 기본값: 3분, 최대 5분)
}

interface GenerateLoginQRTokenResponse {
  tokenId: string;
  qrUrl: string;
  expiresAt: Timestamp;
  sessionId: string;
}

/**
 * 토큰 ID 생성 (안전한 랜덤 문자열)
 */
function generateTokenId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export const generateLoginQRToken = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<GenerateLoginQRTokenResponse> => {
    const { auth, data } = request;

    // 🔥 인증 불필요 (로그인 전 사용자도 QR 생성 가능)
    // 하지만 세션 ID는 필수
    if (!data || !data.sessionId || typeof data.sessionId !== "string") {
      throw new HttpsError("invalid-argument", "sessionId is required");
    }

    const { sessionId, expiresInMinutes = 3 } = data as GenerateLoginQRTokenRequest;

    // 🔥 만료 시간 검증 (2~5분 사이)
    const finalExpiresInMinutes = Math.max(2, Math.min(5, expiresInMinutes));

    // 1️⃣ 토큰 ID 생성
    const tokenId = generateTokenId();

    // 2️⃣ 만료 시간 계산
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + finalExpiresInMinutes * 60 * 1000)
    );

    // 3️⃣ Firestore에 토큰 저장
    const tokenRef = db.collection("loginQRTokens").doc(tokenId);
    const tokenData = {
      sessionId,
      used: false,
      expiresAt,
      createdAt: Timestamp.now(),
      type: "LOGIN_QR",
    };

    await tokenRef.set(tokenData);

    logger.info("✅ [generateLoginQRToken] 토큰 생성 완료", {
      tokenId,
      sessionId,
      expiresAt: expiresAt.toDate().toISOString(),
    });

    // 4️⃣ QR URL 생성 (공개 접근 가능한 URL)
    const publicUrl = process.env.PUBLIC_URL || "https://yagovibe.com";
    const qrUrl = `${publicUrl}/login/qr?token=${tokenId}`;

    return {
      tokenId,
      qrUrl,
      expiresAt,
      sessionId,
    };
  }
);
