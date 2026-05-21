/**
 * 🔥 추천 피드 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 사용자별 개인화 추천 피드 생성
 * - ForYou, Near, Popular 탭 지원
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { generateFeed } from "./feedEngine";

/**
 * 추천 피드 타입
 */
export type FeedType = "forYou" | "near" | "popular";

/**
 * 추천 피드 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const getFeed = httpsCallable(functions, 'getFeed');
 * const result = await getFeed({ type: 'forYou', limit: 20 });
 * ```
 */
export const getFeed = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { type, limit } = request.data;

    if (!userId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const feedType = (type || "forYou") as FeedType;
    const feedLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 50) : 20;

    try {
      logger.info("[getFeed] 피드 요청:", { userId, type: feedType, limit: feedLimit });

      // 🔥 피드 생성
      const feed = await generateFeed(userId, feedLimit);

      logger.info("[getFeed] 피드 생성 완료:", {
        userId,
        type: feedType,
        resultCount: feed.length,
      });

      return {
        success: true,
        type: feedType,
        posts: feed.map((item) => ({
          ...item.post,
          recommendationScore: item.score,
        })),
        count: feed.length,
      };
    } catch (error: any) {
      logger.error("[getFeed] 피드 생성 실패:", {
        userId,
        type: feedType,
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
