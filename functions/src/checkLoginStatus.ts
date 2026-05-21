/**
 * 🔐 로그인 상태 확인 Cloud Function (폴링용)
 * 
 * 역할:
 * - 웹 세션의 로그인 상태 확인
 * - 폴링으로 로그인 완료 감지
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

interface CheckLoginStatusRequest {
  sessionId: string;
}

interface CheckLoginStatusResponse {
  authenticated: boolean;
  userId?: string;
  loggedInAt?: string;
  message?: string;
}

export const checkLoginStatus = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<CheckLoginStatusResponse> => {
    const { data } = request;

    if (!data || !data.sessionId || typeof data.sessionId !== "string") {
      throw new HttpsError("invalid-argument", "sessionId is required");
    }

    const { sessionId } = data as CheckLoginStatusRequest;

    // 1️⃣ 웹 세션 조회
    const sessionRef = db.collection("webSessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return {
        authenticated: false,
        message: "세션을 찾을 수 없습니다.",
      };
    }

    const sessionData = sessionSnap.data()!;

    // 2️⃣ 로그인 상태 확인
    if (sessionData.status === "authenticated" && sessionData.userId) {
      return {
        authenticated: true,
        userId: sessionData.userId,
        loggedInAt: sessionData.loggedInAt?.toDate().toISOString(),
      };
    }

    return {
      authenticated: false,
      message: "로그인 대기 중입니다.",
    };
  }
);
