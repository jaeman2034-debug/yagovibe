/**
 * 🔥 이미지 기반 제목/카테고리 추천 Cloud Function (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이미지에서 상품 인식
 * - 제목 자동 생성
 * - 카테고리 추천
 * - 가격 범위 추정 (유사 매물 기반)
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebase";

/**
 * 이미지 기반 제목/카테고리 추천 결과
 */
interface ImageRecommendation {
  title?: string; // 추천 제목
  category?: "equipment" | "recruit" | "match"; // 추천 카테고리
  suggestedPrice?: { min: number; max: number; recommended: number }; // 가격 범위 추정
  tags?: string[]; // 태그
  confidence: number; // 신뢰도 (0 ~ 1)
  detectedObjects?: string[]; // 감지된 객체
}

/**
 * 유사 매물 기반 가격 추정
 */
async function estimatePriceFromSimilar(
  detectedObjects: string[],
  category: string
): Promise<{ min: number; max: number; recommended: number } | null> {
  try {
    // 🔥 유사 매물 조회 (최근 30일, 같은 카테고리, 비슷한 키워드)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const similarPosts = await db
      .collection("market")
      .where("category", "==", category)
      .where("status", "==", "open")
      .where("createdAt", ">=", thirtyDaysAgo)
      .limit(50)
      .get();

    if (similarPosts.empty) {
      return null;
    }

    const prices: number[] = [];
    similarPosts.docs.forEach((doc) => {
      const data = doc.data();
      if (data.price && typeof data.price === "number" && data.price > 0) {
        prices.push(data.price);
      }
    });

    if (prices.length === 0) {
      return null;
    }

    // 🔥 가격 통계 계산
    prices.sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const median = prices[Math.floor(prices.length / 2)];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const recommended = Math.round((median + avg) / 2);

    return {
      min: Math.round(min),
      max: Math.round(max),
      recommended: Math.round(recommended),
    };
  } catch (error: any) {
    logger.warn("[estimatePriceFromSimilar] 가격 추정 실패:", error.message);
    return null;
  }
}

/**
 * 이미지에서 객체 감지 및 제목 생성 (간단한 휴리스틱 기반)
 * 
 * 실제 프로덕션에서는 Vision API 또는 ML 모델 사용 권장
 */
async function analyzeImageForRecommendation(
  imageUrl: string
): Promise<ImageRecommendation> {
  // 🔥 TODO: 실제 Vision API 또는 ML 모델 사용
  // - Vision API로 사물 인식
  // - 카테고리 분류 모델
  // - 가격 추정 모델

  // 🔥 임시: 기본값 반환 (실제 구현 필요)
  // 실제로는 Vision API를 호출하여 객체를 감지하고, 그 결과를 기반으로 제목을 생성해야 함

  const detectedObjects: string[] = []; // Vision API 결과로 채워짐
  const category: "equipment" | "recruit" | "match" = "equipment"; // 기본값

  // 🔥 가격 추정 (유사 매물 기반)
  const priceEstimate = await estimatePriceFromSimilar(detectedObjects, category);

  return {
    title: undefined, // AI가 추천하지 않음 (Vision API 연동 필요)
    category: undefined,
    suggestedPrice: priceEstimate || undefined,
    tags: [],
    confidence: 0.5,
    detectedObjects,
  };
}

/**
 * 이미지 기반 제목/카테고리 추천 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const recommendFromImage = httpsCallable(functions, 'recommendFromImage');
 * const result = await recommendFromImage({ imageUrl: 'https://...' });
 * ```
 */
export const recommendFromImage = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { imageUrl } = request.data;

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "imageUrl이 필요합니다."
      );
    }

    try {
      logger.info("[recommendFromImage] 추천 시작:", { imageUrl });

      const recommendation = await analyzeImageForRecommendation(imageUrl);

      logger.info("[recommendFromImage] 추천 완료:", {
        imageUrl,
        hasTitle: !!recommendation.title,
        hasCategory: !!recommendation.category,
        hasPrice: !!recommendation.suggestedPrice,
        confidence: recommendation.confidence,
      });

      return {
        success: true,
        recommendation,
      };
    } catch (error: any) {
      logger.error("[recommendFromImage] 추천 실패:", {
        imageUrl,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "이미지 추천 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
