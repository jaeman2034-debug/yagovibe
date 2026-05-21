/**
 * 🔥 AI 추천 엔진 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 이미지 → Vision 분석 → 키워드 추출
 * - 제목 자동 생성
 * - 카테고리 매핑
 * - 유사 매물 조회 → 가격 추천
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { db, Timestamp } from "../firebase";

/**
 * AI 추천 결과
 */
interface AISuggestion {
  title?: string; // 추천 제목
  category?: "equipment" | "recruit" | "match"; // 추천 카테고리
  suggestedPrice?: { min: number; max: number; recommended: number }; // 가격 가이드
  tags?: string[]; // 태그
  confidence: number; // 신뢰도 (0 ~ 1)
  detectedObjects?: string[]; // 감지된 객체
}

/**
 * 브랜드 사전
 */
const BRANDS = [
  "나이키", "아디다스", "푸마", "언더아머", "미즈노", "아식스",
  "nike", "adidas", "puma", "underarmour", "mizuno", "asics",
  "NIKE", "ADIDAS", "PUMA",
];

/**
 * 아이템 키워드 사전
 */
const ITEMS = [
  "축구화", "풋살화", "운동화", "신발", "슈즈",
  "축구공", "공", "볼",
  "유니폼", "저지", "옷",
  "가방", "백팩",
  "축구", "풋살", "soccer", "football",
];

/**
 * 카테고리 키워드 매핑
 */
const CATEGORY_KEYWORDS: Record<string, "equipment" | "recruit" | "match"> = {
  equipment: "equipment",
  recruit: "recruit",
  match: "match",
};

/**
 * 키워드에서 브랜드 추출
 */
function extractBrand(keywords: string[]): string | null {
  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    for (const brand of BRANDS) {
      if (lower.includes(brand.toLowerCase()) || brand.toLowerCase().includes(lower)) {
        return brand;
      }
    }
  }
  return null;
}

/**
 * 키워드에서 아이템 추출
 */
function extractItem(keywords: string[]): string | null {
  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    for (const item of ITEMS) {
      if (lower.includes(item.toLowerCase()) || item.toLowerCase().includes(lower)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * 제목 생성
 */
function generateTitle(keywords: string[]): string | undefined {
  if (keywords.length === 0) {
    return undefined;
  }

  const brand = extractBrand(keywords);
  const item = extractItem(keywords);

  // 🔥 브랜드 + 아이템 조합
  if (brand && item) {
    return `${brand} ${item} 판매합니다`;
  }

  // 🔥 브랜드만
  if (brand) {
    return `${brand} ${keywords[0] || "상품"} 판매합니다`;
  }

  // 🔥 아이템만
  if (item) {
    return `${item} 판매합니다`;
  }

  // 🔥 키워드 조합
  if (keywords.length >= 2) {
    return `${keywords[0]} ${keywords[1]} 판매합니다`;
  }

  return `${keywords[0]} 판매합니다`;
}

/**
 * 카테고리 매핑
 */
function mapCategory(keywords: string[]): "equipment" | "recruit" | "match" | undefined {
  const keywordStr = keywords.join(" ").toLowerCase();

  // 🔥 equipment 키워드
  if (
    keywordStr.includes("축구화") ||
    keywordStr.includes("풋살화") ||
    keywordStr.includes("신발") ||
    keywordStr.includes("슈즈") ||
    keywordStr.includes("축구공") ||
    keywordStr.includes("유니폼") ||
    keywordStr.includes("가방") ||
    keywordStr.includes("shoe") ||
    keywordStr.includes("ball") ||
    keywordStr.includes("uniform")
  ) {
    return "equipment";
  }

  // 🔥 recruit 키워드
  if (
    keywordStr.includes("팀") ||
    keywordStr.includes("모집") ||
    keywordStr.includes("선수") ||
    keywordStr.includes("team") ||
    keywordStr.includes("recruit")
  ) {
    return "recruit";
  }

  // 🔥 match 키워드
  if (
    keywordStr.includes("경기") ||
    keywordStr.includes("매칭") ||
    keywordStr.includes("경기장") ||
    keywordStr.includes("match") ||
    keywordStr.includes("game")
  ) {
    return "match";
  }

  return undefined;
}

/**
 * 유사 매물 기반 가격 가이드
 */
async function priceGuide(
  category: string | undefined,
  keywords: string[]
): Promise<{ min: number; max: number; recommended: number } | null> {
  if (!category || category === "recruit" || category === "match") {
    return null; // equipment만 가격 가이드 제공
  }

  try {
    // 🔥 최근 30일 유사 매물 조회
    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    let query = db
      .collection("market")
      .where("category", "==", category)
      .where("status", "==", "open")
      .where("createdAt", ">=", thirtyDaysAgo)
      .limit(50);

    const similarPosts = await query.get();

    if (similarPosts.empty) {
      logger.info("[priceGuide] 유사 매물 없음:", { category });
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

    logger.info("[priceGuide] 가격 가이드 계산:", {
      category,
      sampleSize: prices.length,
      min,
      max,
      recommended,
    });

    return {
      min: Math.round(min),
      max: Math.round(max),
      recommended: Math.round(recommended),
    };
  } catch (error: any) {
    logger.warn("[priceGuide] 가격 추정 실패:", error.message);
    return null;
  }
}

/**
 * Vision 분석 (간단한 휴리스틱 기반)
 * 
 * 실제 프로덕션에서는 Vision API 사용 권장
 */
async function analyzeImage(imageUrl: string): Promise<string[]> {
  // 🔥 TODO: 실제 Vision API 호출
  // const vision = await visionAPI.annotateImage(imageUrl);
  // return vision.labels.map(l => l.description);

  // 🔥 임시: 기본 키워드 반환 (실제 구현 필요)
  // 실제로는 Vision API를 호출하여 객체를 감지하고, 그 결과를 반환해야 함
  return ["축구화", "나이키"]; // 예시
}

/**
 * AI 추천 엔진 (메인 함수)
 */
async function generateSuggestion(
  imageUrl: string,
  quality?: { score: number; detectedObjects?: string[] }
): Promise<AISuggestion> {
  // 🔥 1. Vision 분석 (또는 품질 분석 결과 재활용)
  let keywords: string[] = [];
  
  if (quality?.detectedObjects && quality.detectedObjects.length > 0) {
    keywords = quality.detectedObjects;
  } else {
    keywords = await analyzeImage(imageUrl);
  }

  // 🔥 2. 제목 생성
  const title = generateTitle(keywords);

  // 🔥 3. 카테고리 매핑
  const category = mapCategory(keywords);

  // 🔥 4. 가격 가이드
  const priceGuideResult = await priceGuide(category, keywords);

  // 🔥 5. 신뢰도 계산
  const confidence = keywords.length > 0 ? Math.min(0.9, keywords.length * 0.2) : 0.5;

  return {
    title,
    category,
    suggestedPrice: priceGuideResult || undefined,
    tags: keywords.slice(0, 5),
    confidence,
    detectedObjects: keywords,
  };
}

/**
 * AI 추천 Cloud Function
 * 
 * 호출 예시:
 * ```ts
 * const suggestFromImage = httpsCallable(functions, 'suggestFromImage');
 * const result = await suggestFromImage({ imageUrl: 'https://...', quality: {...} });
 * ```
 */
export const suggestFromImage = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const { imageUrl, quality } = request.data;

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "imageUrl이 필요합니다."
      );
    }

    try {
      logger.info("[suggestFromImage] 추천 시작:", { imageUrl, hasQuality: !!quality });

      const suggestion = await generateSuggestion(imageUrl, quality);

      logger.info("[suggestFromImage] 추천 완료:", {
        imageUrl,
        hasTitle: !!suggestion.title,
        hasCategory: !!suggestion.category,
        hasPrice: !!suggestion.suggestedPrice,
        confidence: suggestion.confidence,
        keywords: suggestion.detectedObjects?.length || 0,
      });

      return {
        success: true,
        suggestion,
      };
    } catch (error: any) {
      logger.error("[suggestFromImage] 추천 실패:", {
        imageUrl,
        error: error.message,
        stack: error.stack,
      });

      throw new HttpsError(
        "internal",
        "AI 추천 중 오류가 발생했습니다.",
        { originalError: error.message }
      );
    }
  }
);
