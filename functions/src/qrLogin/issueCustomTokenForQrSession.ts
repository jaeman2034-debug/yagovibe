/**
 * 🔐 QR 세션 verified → token_ready 자동 처리 (Firestore Trigger)
 * 
 * 역할:
 * - qrSessions/{sessionId} 문서가 verified로 변경되면
 * - Custom Token 자동 발급
 * - status를 token_ready로 업데이트
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

/**
 * QR 로그인 이벤트 로깅 (Firestore에 저장)
 */
async function logQREvent(
  eventType: string,
  sessionId: string,
  data: Record<string, any> = {}
) {
  try {
    await db.collection("qrLoginLogs").add({
      eventType,
      sessionId,
      ...data,
      timestamp: Timestamp.now(),
      region: "asia-northeast3",
    });
  } catch (error) {
    // 로깅 실패해도 무시 (주요 기능에 영향 없음)
    logger.warn("⚠️ [issueCustomTokenForQrSession] 이벤트 로깅 실패:", error);
  }
}

// 🔥 Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * QR 세션이 verified로 변경되면 Custom Token 자동 발급
 */
export const issueCustomTokenForQrSession = onDocumentUpdated(
  {
    document: "qrSessions/{sessionId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const sessionId = event.params.sessionId;

    if (!before || !after) {
      logger.warn("🔐 [issueCustomTokenForQrSession] before/after 데이터 없음");
      return;
    }

    // ✅ status가 verified로 "변경된 순간"만 처리
    const becameVerified = before.status !== "verified" && after.status === "verified";
    if (!becameVerified) {
      logger.info("🔐 [issueCustomTokenForQrSession] verified 상태 변경 아님:", {
        sessionId,
        beforeStatus: before.status,
        afterStatus: after.status,
      });
      return;
    }

    logger.info("✅ [issueCustomTokenForQrSession] verified 감지, Custom Token 발급 시작:", sessionId);
    
    // 📊 이벤트 로깅: verified 감지
    await logQREvent("verified_detected", sessionId, {
      userId: after.userId,
      beforeStatus: before.status,
    });

    // 만료 체크
    const expiresAt = after.expiresAt as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      logger.warn("⏰ [issueCustomTokenForQrSession] 세션 만료됨:", sessionId);
      await event.data!.after.ref.set(
        { status: "expired" },
        { merge: true }
      );
      
      // 📊 이벤트 로깅: 만료
      await logQREvent("session_expired", sessionId, {
        reason: "expired_before_token_issue",
        userId: after.userId,
      });
      return;
    }

    const userId = after.userId as string | undefined;
    if (!userId) {
      logger.error("❌ [issueCustomTokenForQrSession] userId 없음:", sessionId);
      
      // 📊 이벤트 로깅: userId 없음
      await logQREvent("error", sessionId, {
        error: "missing_userId",
      });
      return;
    }

    // 이미 토큰이 있으면 중복 발급 방지
    if (after.customToken) {
      logger.info("🔐 [issueCustomTokenForQrSession] 이미 토큰 존재, 중복 발급 방지:", sessionId);
      
      // 📊 이벤트 로깅: 중복 발급 방지
      await logQREvent("duplicate_token_prevented", sessionId, {
        userId,
      });
      return;
    }

    try {
      // ✅ 커스텀 토큰 발급 (1시간 유효)
      const token = await auth.createCustomToken(userId, {
        qrSessionId: sessionId,
        issuedAt: Date.now(),
        loginMethod: "qr_phone",
      });

      logger.info("✅ [issueCustomTokenForQrSession] Custom Token 발급 완료:", {
        sessionId,
        userId,
      });

      // ✅ 문서 업데이트
      await event.data!.after.ref.set(
        {
          customToken: token,
          status: "token_ready",
          tokenIssuedAt: Timestamp.now(),
        },
        { merge: true }
      );

      logger.info("✅ [issueCustomTokenForQrSession] 문서 업데이트 완료 (token_ready):", sessionId);
      
      // 📊 이벤트 로깅: 토큰 발급 성공
      await logQREvent("token_issued", sessionId, {
        userId,
        tokenIssuedAt: Timestamp.now().toMillis(),
      });
    } catch (error: any) {
      logger.error("❌ [issueCustomTokenForQrSession] Custom Token 발급 실패:", {
        sessionId,
        userId,
        error: error.message,
        stack: error.stack,
      });
      
      // 에러 발생 시 세션을 expired로 마킹
      await event.data!.after.ref.set(
        { status: "expired", error: error.message },
        { merge: true }
      );
      
      // 📊 이벤트 로깅: 토큰 발급 실패
      await logQREvent("token_issue_failed", sessionId, {
        userId,
        error: error.message,
        errorCode: error.code || "unknown",
      });
    }
  }
);
