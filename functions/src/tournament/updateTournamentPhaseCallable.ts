// 🔥 대회 Phase 변경 (Callable) - 독립된 파일
// Firebase Functions 초기화 타임아웃 방지를 위한 완전 고립 버전

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

/**
 * 🔥 대회 Phase 변경 (Callable)
 * 
 * ✅ 완전 고립 버전: 초기화 시 무거운 import 전부 차단
 * ✅ 모든 로직은 함수 실행 시점에만 동적으로 import
 */
export const updateTournamentPhaseCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      logger.info("CALL START", request.data);
      
      // 🔥 동적 import: 실행 시점에만 로드됨 (초기화 단계 제외)
      const updateTournamentPhaseModule = await import("./updateTournamentPhase");
      
      const result = await updateTournamentPhaseModule.updateTournamentPhaseCallableImpl(request);
      return result;
    } catch (err: any) {
      logger.error("TOP LEVEL ERROR", err);
      
      // ✅ HttpsError는 그대로 전달 (에러 메시지 보존)
      if (err instanceof HttpsError) {
        throw err;
      }

      // 기타 오류는 HttpsError로 변환
      throw new HttpsError(
        "internal",
        String(err),
        { originalError: String(err) }
      );
    }
  }
);
