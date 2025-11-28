import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * AI 가격 추천 엔진
 * - Firebase에서 유사 상품 검색하여 평균가 계산
 * - AI가 시세 + 상태 + 시장 상황을 고려하여 가격 추천
 */
export const getPriceRecommendation = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { productName, category, condition, brand, latitude, longitude } = req.body;

      if (!productName || !category) {
        res.status(400).json({ error: "productName과 category는 필수입니다." });
        return;
      }

      logger.info("💰 가격 추천 요청:", { productName, category, condition, brand });

      // 1) Firebase에서 유사 상품 검색 (같은 카테고리)
      let prices: number[] = [];
      let similarProducts: any[] = [];

      try {
        const snapshot = await db
          .collection("marketProducts")
          .where("category", "==", category)
          .limit(50)
          .get();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const price = typeof data.price === "number" ? data.price : 
                       typeof data.price === "string" ? Number(data.price.replace(/[^\d.-]/g, "")) : null;
          
          if (price && price > 0 && price < 10000000) { // 유효한 가격 범위
            prices.push(price);
            similarProducts.push({
              name: data.name || "",
              price: price,
              condition: data.condition || "중",
            });
          }
        });

        logger.info(`📊 유사 상품 ${similarProducts.length}개 발견, 가격 ${prices.length}개 수집`);
      } catch (firestoreError: any) {
        logger.warn("⚠️ Firestore 검색 오류:", firestoreError);
        // Firestore 오류가 있어도 계속 진행
      }

      // 평균가 계산
      const avgPrice = prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : null;
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

      // 2) AI에 시세 + 상품상태 + 시장상황 넣어서 추천가 결정
      const marketContext = prices.length > 0
        ? `
시장 데이터:
- 유사 상품 ${prices.length}개 발견
- 평균가: ${Math.round(avgPrice!).toLocaleString()}원
- 최저가: ${Math.round(minPrice!).toLocaleString()}원
- 최고가: ${Math.round(maxPrice!).toLocaleString()}원
- 가격 범위: ${Math.round(minPrice!).toLocaleString()}원 ~ ${Math.round(maxPrice!).toLocaleString()}원
`
        : "시장 데이터: 유사 상품 데이터 없음";

      const prompt = `
당신은 중고거래 가격 책정 전문가입니다.
다음 정보로 적정 판매가를 추천해주세요.

[상품 정보]
- 상품명: ${productName}
- 카테고리: ${category}
- 브랜드: ${brand || "불명"}
- 상태: ${condition || "중"}

${marketContext}

[가격 책정 기준]
- 한국 중고 거래 시장 기준
- 상태가 "상"이면 평균가의 110~120%
- 상태가 "중"이면 평균가의 90~110%
- 상태가 "하"이면 평균가의 70~90%
- 브랜드가 명품이면 추가 프리미엄 고려
- 시장 데이터가 없으면 일반적인 중고 시세 기준

다음 JSON 형식으로만 출력 (다른 설명 없이 JSON만):

{
  "recommendedPrice": 숫자,
  "priceRange": { "min": 숫자, "max": 숫자 },
  "confidence": 0.0~1.0 사이 숫자,
  "reason": "가격 추천 이유 (한국어로 간단히)"
}

조건:
- recommendedPrice는 권장 판매가 (원 단위, 숫자만)
- priceRange.min은 최소 추천가
- priceRange.max는 최대 추천가
- confidence는 신뢰도 (시장 데이터가 많을수록 높음)
- reason은 왜 이 가격을 추천하는지 설명
- 반드시 유효한 JSON 형식만 출력
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 가격 책정 전문가입니다. 시장 데이터와 상품 상태를 분석하여 정확한 가격을 추천합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 500,
        });

        const aiText = aiResp.choices[0]?.message?.content || "{}";
        logger.info("🤖 AI 가격 추천 결과:", aiText);

        // JSON 파싱
        let result: any;
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(aiText);
          }

          // 필수 필드 검증 및 기본값 설정
          result = {
            recommendedPrice: typeof result.recommendedPrice === "number" ? result.recommendedPrice : 
                           avgPrice ? Math.round(avgPrice) : 50000,
            priceRange: {
              min: typeof result.priceRange?.min === "number" ? result.priceRange.min :
                   typeof result.recommendedPrice === "number" ? Math.round(result.recommendedPrice * 0.85) :
                   avgPrice ? Math.round(avgPrice * 0.85) : 40000,
              max: typeof result.priceRange?.max === "number" ? result.priceRange.max :
                   typeof result.recommendedPrice === "number" ? Math.round(result.recommendedPrice * 1.15) :
                   avgPrice ? Math.round(avgPrice * 1.15) : 60000,
            },
            confidence: typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1
              ? result.confidence
              : prices.length > 5 ? 0.85 : prices.length > 0 ? 0.70 : 0.50,
            reason: typeof result.reason === "string" ? result.reason :
                   `유사 상품 ${prices.length}개 기준 평균가 ${avgPrice ? Math.round(avgPrice).toLocaleString() : "없음"}원`,
            marketData: {
              avgPrice: avgPrice ? Math.round(avgPrice) : null,
              minPrice: minPrice ? Math.round(minPrice) : null,
              maxPrice: maxPrice ? Math.round(maxPrice) : null,
              sampleCount: prices.length,
            },
          };

          logger.info("✅ 가격 추천 완료:", result);
          res.json(result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          
          // Fallback: 시장 평균가 기반 추천
          const fallbackPrice = avgPrice ? Math.round(avgPrice) : 50000;
          const conditionMultiplier = condition === "상" ? 1.15 : condition === "하" ? 0.85 : 1.0;
          const finalPrice = Math.round(fallbackPrice * conditionMultiplier);

          res.json({
            recommendedPrice: finalPrice,
            priceRange: {
              min: Math.round(finalPrice * 0.85),
              max: Math.round(finalPrice * 1.15),
            },
            confidence: prices.length > 0 ? 0.70 : 0.50,
            reason: `시장 평균가 ${fallbackPrice.toLocaleString()}원 기준, 상태 "${condition || "중"}" 반영`,
            marketData: {
              avgPrice: avgPrice ? Math.round(avgPrice) : null,
              minPrice: minPrice ? Math.round(minPrice) : null,
              maxPrice: maxPrice ? Math.round(maxPrice) : null,
              sampleCount: prices.length,
            },
          });
        }
      } catch (aiError: any) {
        logger.error("❌ AI 가격 추천 오류:", aiError);
        
        // Fallback: 시장 평균가 기반 추천
        const fallbackPrice = avgPrice ? Math.round(avgPrice) : 50000;
        const conditionMultiplier = condition === "상" ? 1.15 : condition === "하" ? 0.85 : 1.0;
        const finalPrice = Math.round(fallbackPrice * conditionMultiplier);

        res.json({
          recommendedPrice: finalPrice,
          priceRange: {
            min: Math.round(finalPrice * 0.85),
            max: Math.round(finalPrice * 1.15),
          },
          confidence: prices.length > 0 ? 0.65 : 0.45,
          reason: `시장 평균가 기반 추천 (AI 분석 실패, 시장 데이터만 사용)`,
          marketData: {
            avgPrice: avgPrice ? Math.round(avgPrice) : null,
            minPrice: minPrice ? Math.round(minPrice) : null,
            maxPrice: maxPrice ? Math.round(maxPrice) : null,
            sampleCount: prices.length,
          },
        });
      }
    } catch (e: any) {
      logger.error("🔥 가격 추천 서버 오류:", e);
      res.status(500).json({ error: true, message: e.message });
    }
  }
);

