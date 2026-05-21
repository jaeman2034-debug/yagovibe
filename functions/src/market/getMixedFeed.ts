/**
 * 🔥 혼합 피드 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 추천상품 60% + 커뮤니티 30% + 광고 10%
 * - 네트워크 효과 극대화
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { generateMixedFeed } from "./mixedFeed";

/**
 * 혼합 피드 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const getMixedFeed = httpsCallable(functions, 'getMixedFeed');
 * const result = await getMixedFeed({ limit: 20 });
 * ```
 */
export const getMixedFeed = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { limit, location, category } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const feedLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 50) : 20;

    try {
      logger.info("[getMixedFeed] 혼합 피드 요청:", {
        userId,
        limit: feedLimit,
        location,
        category,
      });

      const feed = await generateMixedFeed(
        userId,
        feedLimit,
        location,
        category
      );

      logger.info("[getMixedFeed] 혼합 피드 생성 완료:", {
        userId,
        resultCount: feed.length,
      });

      return {
        success: true,
        items: feed,
        count: feed.length,
      };
    } catch (error: any) {
      logger.error("[getMixedFeed] 혼합 피드 생성 실패:", {
        userId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "피드 생성 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
