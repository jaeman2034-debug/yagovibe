// 🔥 조 추첨 실행 (Callable) - 독립된 파일
// Firebase Functions 초기화 타임아웃 방지를 위한 완전 고립 버전

import { onCall, HttpsError } from "firebase-functions/v2/https";

/**
 * 🔥 조 추첨 실행 (Callable)
 * 
 * ✅ 완전 고립 버전: 초기화 시 무거운 import 전부 차단
 * ✅ 모든 로직은 함수 실행 시점에만 동적으로 import
 */
export const executeDrawCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120, // 🔥 타임아웃 60초 → 120초로 증가 (대량 write 대비)
  },
  async (request) => {
    try {
      // 🔥 함수 실행 시점에만 모든 모듈 동적으로 import
      // ⚠️ 초기화 단계에서는 이 코드가 실행되지 않으므로 타임아웃 없음
      console.log("[executeDrawCallable] ========== 시작 ==========");
      console.log("[executeDrawCallable] request.auth:", !!request?.auth);
      console.log("[executeDrawCallable] request.data keys:", request?.data ? Object.keys(request.data) : "없음");
      
      // 🔥 동적 import: 실행 시점에만 로드됨 (초기화 단계 제외)
      const executeDrawModule = await import("./executeDraw");
      console.log("[executeDrawCallable] 모듈 import 완료");
      
      const result = await executeDrawModule.executeDrawCallableImpl(request);
      console.log("[executeDrawCallable] ========== 실행 완료 ==========");
      return result;
    } catch (error: any) {
      // 🔥 상세 로깅
      console.error("[executeDrawCallable] 에러 발생:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        details: error?.details,
        request: {
          hasAuth: !!request?.auth,
          hasData: !!request?.data,
          dataKeys: request?.data ? Object.keys(request.data) : [],
        },
      });
      
      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        console.log("[executeDrawCallable] HttpsError 재전달:", error.code, error.message);
        throw error;
      }
      
      // 일반 에러는 상세 정보와 함께 전달
      const errorMessage = error?.message || error?.toString() || "알 수 없는 오류";
      const errorStack = error?.stack || "";
      const errorCode = error?.code || "UNKNOWN";
      
      console.error("[executeDrawCallable] 일반 에러를 HttpsError로 변환:", {
        errorMessage,
        errorCode,
        errorStack: errorStack?.substring(0, 500),
      });
      
      throw new HttpsError(
        "internal",
        `조 추첨 실행 중 오류 (${errorCode}): ${errorMessage}`,
        {
          originalError: errorMessage,
          code: errorCode,
          stack: errorStack?.substring(0, 1000),
        }
      );
    }
  }
);

