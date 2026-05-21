/**
 * 🔥 시맨틱 검색 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 사용자 쿼리 → 임베딩 생성
 * - 벡터 유사도 검색
 * - 결과 반환
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { semanticSearch } from "./embedding";

/**
 * 시맨틱 검색 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const searchMarket = httpsCallable(functions, 'searchMarket');
 * const result = await searchMarket({ query: '나이키 축구화', limit: 20 });
 * ```
 */
export const searchMarket = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { query, limit } = request.data;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "검색어가 필요합니다."
      );
    }

    const searchLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 50) : 20;

    try {
      logger.info("[searchMarket] 검색 시작:", { query, limit: searchLimit });

      const results = await semanticSearch(query.trim(), searchLimit);

      logger.info("[searchMarket] 검색 완료:", {
        query,
        resultCount: results.length,
      });

      return {
        success: true,
        query: query.trim(),
        results: results.map((r) => ({
          id: r.id,
          score: r.score,
          ...r.data,
        })),
        count: results.length,
      };
    } catch (error: any) {
      logger.error("[searchMarket] 검색 실패:", {
        query,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "검색 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
