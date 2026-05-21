// 🔥 플레이오프 자동 생성 (Callable) - 독립된 파일
// Firebase Functions 초기화 타임아웃 방지를 위한 완전 고립 버전

import { onCall } from "firebase-functions/v2/https";

/**
 * 🔥 플레이오프 자동 생성 (Callable)
 * 
 * ✅ 완전 고립 버전: 초기화 시 무거운 import 전부 차단
 * ✅ 모든 로직은 함수 실행 시점에만 동적으로 import
 */
export const generatePlayoffCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      console.log("[generatePlayoffCallable] ========== 시작 ==========");
      console.log("[generatePlayoffCallable] request.auth:", !!request?.auth);
      console.log("[generatePlayoffCallable] request.data keys:", request?.data ? Object.keys(request.data) : "없음");
      
      // 🔥 동적 import: 실행 시점에만 로드됨 (초기화 단계 제외)
      const generatePlayoffModule = await import("./generatePlayoff");
      console.log("[generatePlayoffCallable] 모듈 import 완료");
      
      const result = await generatePlayoffModule.generatePlayoffCallableImpl(request);
      console.log("[generatePlayoffCallable] ========== 실행 완료 ==========");
      return result;
    } catch (error: any) {
      // 🔥 에러 처리
      const { HttpsError } = await import("firebase-functions/v2/https");
      
      // 🔥 상세 로깅
      console.error("[generatePlayoffCallable] 에러 발생:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        details: error?.details,
      });
      
      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        console.log("[generatePlayoffCallable] HttpsError 재전달:", error.code, error.message);
        throw error;
      }
      
      // 일반 에러는 상세 정보와 함께 전달
      const errorMessage = error?.message || error?.toString() || "알 수 없는 오류";
      const errorStack = error?.stack || "";
      const errorCode = error?.code || "UNKNOWN";
      
      throw new HttpsError(
        "internal",
        `플레이오프 자동 생성 중 오류 (${errorCode}): ${errorMessage}`,
        {
          originalError: errorMessage,
          code: errorCode,
          stack: errorStack?.substring(0, 1000),
        }
      );
    }
  }
);

