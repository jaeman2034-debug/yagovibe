/**
 * 🔥 광고 생성 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 광고주가 광고 생성
 * - 지역 타겟팅 설정
 * - 예산 설정
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { createAd, type AdType } from "./ads";

/**
 * 광고 생성 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const createAdCallable = httpsCallable(functions, 'createAd');
 * const result = await createAdCallable({
 *   type: 'BANNER',
 *   title: '할인 이벤트',
 *   linkUrl: 'https://...',
 *   budget: 100000,
 *   cpc: 100,
 *   cpm: 5000,
 * });
 * ```
 */
export const createAdCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const ownerId = request.auth?.uid;
    const {
      type,
      title,
      description,
      imageUrl,
      linkUrl,
      targetLocation,
      targetCategory,
      budget,
      cpc,
      cpm,
      startDate,
      endDate,
    } = request.data;

    if (!ownerId) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!type || !title || !linkUrl || !budget || !cpc || !cpm) {
      throw new HttpsError(
        "invalid-argument",
        "필수 필드가 누락되었습니다."
      );
    }

    const validTypes: AdType[] = ["BANNER", "BOOST", "STORE"];
    if (!validTypes.includes(type)) {
      throw new HttpsError(
        "invalid-argument",
        `유효하지 않은 광고 타입: ${type}`
      );
    }

    try {
      logger.info("[createAd] 광고 생성 시작:", {
        ownerId,
        type,
        title,
        budget,
      });

      const adId = await createAd(ownerId, {
        type: type as AdType,
        title: title.trim(),
        description: description?.trim(),
        imageUrl,
        linkUrl: linkUrl.trim(),
        targetLocation,
        targetCategory: targetCategory || [],
        budget: Number(budget),
        cpc: Number(cpc),
        cpm: Number(cpm),
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 기본 30일
      });

      logger.info("[createAd] 광고 생성 완료:", {
        adId,
        ownerId,
        type,
      });

      return {
        success: true,
        adId,
      };
    } catch (error: any) {
      logger.error("[createAd] 광고 생성 실패:", {
        ownerId,
        type,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "광고 생성 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
