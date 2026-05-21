/**
 * 🔥 광고 조회 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 지역 타겟팅 광고 조회
 * - 노출 기록 및 과금
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { getTargetedAds, recordImpression } from "./ads";

/**
 * 광고 조회 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const getAds = httpsCallable(functions, 'getAds');
 * const result = await getAds({
 *   location: { lat: 37.5, lng: 127.0 },
 *   category: 'equipment',
 * });
 * ```
 */
export const getAds = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const userId = request.auth?.uid;
    const { location, category, limit } = request.data;

    const adLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 10) : 3;

    try {
      logger.info("[getAds] 광고 조회 시작:", {
        userId,
        location,
        category,
        limit: adLimit,
      });

      const ads = await getTargetedAds(location, category, adLimit);

      // 🔥 노출 기록 (비동기)
      for (const ad of ads) {
        recordImpression(ad.id).catch((err) => {
          logger.warn("[getAds] 노출 기록 실패:", {
            adId: ad.id,
            error: err.message,
          });
        });
      }

      logger.info("[getAds] 광고 조회 완료:", {
        userId,
        resultCount: ads.length,
      });

      return {
        success: true,
        ads: ads.map((ad) => ({
          id: ad.id,
          type: ad.type,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          linkUrl: ad.linkUrl,
        })),
        count: ads.length,
      };
    } catch (error: any) {
      logger.error("[getAds] 광고 조회 실패:", {
        userId,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "광고 조회 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
