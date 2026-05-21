/**
 * 🔐 로그인용 QR 관련 API 호출
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";

const functions = getFunctions();

/**
 * 로그인용 QR 토큰 생성
 */
export async function generateLoginQRToken(sessionId: string, expiresInMinutes: number = 3) {
  const generateQR = httpsCallable(functions, "generateLoginQRToken");
  const result = await generateQR({
    sessionId,
    expiresInMinutes,
  });
  return result.data as {
    tokenId: string;
    qrUrl: string;
    expiresAt: { seconds: number; nanoseconds: number };
    sessionId: string;
  };
}

/**
 * 로그인 상태 확인 (폴링용)
 */
export async function checkLoginStatus(sessionId: string) {
  const checkStatus = httpsCallable(functions, "checkLoginStatus");
  const result = await checkStatus({ sessionId });
  return result.data as {
    authenticated: boolean;
    userId?: string;
    loggedInAt?: string;
    message?: string;
  };
}
