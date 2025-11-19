import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * AI 가격 미래 예측 시스템
 * - Firestore 시세 데이터 기반 과거 가격 추세 분석
 * - AI가 1~2주 후 가격 변동 예측
 * - 시장 상황, 계절성, 카테고리 특성 등을 종합 고려
 */
export const getPricePrediction = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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
      const { productName, category, currentPrice, condition } = req.body;

      if (!productName || !category) {
        res.json({
          predictedPrice: currentPrice || null,
          trend: "stable",
          confidence: 0.5,
          reason: "상품 정보가 부족하여 예측할 수 없습니다.",
          priceHistory: [],
        });
        return;
      }

      logger.info("📈 가격 예측 요청:", { productName, category, currentPrice });

      // 1) Firestore에서 같은 카테고리 상품들의 가격 이력 수집
      let priceHistory: number[] = [];
      let avgPrice: number | null = null;
      let minPrice: number | null = null;
      let maxPrice: number | null = null;

      try {
        const snapshot = await db
          .collection("marketProducts")
          .where("category", "==", category)
          .limit(50)
          .get();

        const prices: number[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const price = typeof data.price === "number" ? data.price : 
                       typeof data.price === "string" ? Number(data.price.replace(/[^\d.-]/g, "")) : null;
          
          if (price && price > 0 && price < 10000000) {
            prices.push(price);
          }
        });

        if (prices.length > 0) {
          priceHistory = prices;
          avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          minPrice = Math.min(...prices);
          maxPrice = Math.max(...prices);
        }
      } catch (firestoreError: any) {
        logger.warn("⚠️ Firestore 가격 이력 수집 오류:", firestoreError);
      }

      // 2) AI가 가격 변동 예측
      const marketContext = priceHistory.length > 0
        ? `
시장 데이터:
- 유사 상품 ${priceHistory.length}개 발견
- 평균가: ${Math.round(avgPrice!).toLocaleString()}원
- 최저가: ${Math.round(minPrice!).toLocaleString()}원
- 최고가: ${Math.round(maxPrice!).toLocaleString()}원
- 현재 가격: ${currentPrice ? Math.round(currentPrice).toLocaleString() : "없음"}원
`
        : "시장 데이터: 유사 상품 데이터 없음";

      const prompt = `
너는 중고거래 플랫폼의 가격 예측 전문가야.

아래 정보를 기반으로 1~2주 후 가격 변동을 예측해줘.

### 상품 정보
- 상품명: ${productName}
- 카테고리: ${category}
- 현재 가격: ${currentPrice ? Math.round(currentPrice).toLocaleString() : "없음"}원
- 상태: ${condition || "중"}

${marketContext}

### 예측 기준
1. 시장 평균가 대비 현재 가격 위치
2. 카테고리별 가격 변동 패턴 (전자기기는 빠르게 하락, 의류는 안정적 등)
3. 계절성 (스포츠 용품은 시즌에 따라 변동)
4. 상태에 따른 가격 변동 (상태 좋으면 가격 유지, 나쁘면 하락)
5. 시장 수요 추세

### 출력 형식(JSON만):
{
  "predictedPrice": 숫자 (1~2주 후 예상 가격),
  "trend": "up | down | stable" (가격 추세),
  "confidence": 0.0~1.0 (예측 신뢰도),
  "reason": "예측 이유 (한국어로 간단히)",
  "priceChange": 숫자 (변동 금액, 양수면 상승, 음수면 하락),
  "priceChangePercent": 숫자 (변동률 %)
}

조건:
- predictedPrice는 현재 가격 기준으로 예측
- trend는 "up"(상승), "down"(하락), "stable"(유지) 중 하나
- confidence는 시장 데이터가 많을수록 높음
- reason은 왜 이 가격으로 예측하는지 설명
- 반드시 유효한 JSON만 출력

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 가격 예측 전문가입니다. 시장 데이터와 상품 정보를 분석하여 정확한 가격 변동을 예측합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 400,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 가격 예측 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          predictedPrice: number;
          trend: string;
          confidence: number;
          reason: string;
          priceChange: number;
          priceChangePercent: number;
          priceHistory: number[];
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const currentPriceNum = currentPrice ? Number(currentPrice) : avgPrice || 0;
          const predictedPrice = typeof parsed.predictedPrice === "number" && parsed.predictedPrice > 0
            ? parsed.predictedPrice
            : currentPriceNum;

          const trend = parsed.trend === "up" || parsed.trend === "down" || parsed.trend === "stable"
            ? parsed.trend
            : "stable";

          const confidence = typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1
            ? parsed.confidence
            : priceHistory.length > 10 ? 0.75 : priceHistory.length > 0 ? 0.60 : 0.45;

          const priceChange = predictedPrice - currentPriceNum;
          const priceChangePercent = currentPriceNum > 0
            ? (priceChange / currentPriceNum) * 100
            : 0;

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : trend === "up"
            ? "시장 상황을 고려할 때 가격 상승 가능성이 있습니다."
            : trend === "down"
            ? "시장 상황을 고려할 때 가격 하락 가능성이 있습니다."
            : "현재 가격이 시장 평균과 유사하여 가격 변동이 적을 것으로 예상됩니다.";

          result = {
            predictedPrice: Math.round(predictedPrice),
            trend,
            confidence,
            reason,
            priceChange: Math.round(priceChange),
            priceChangePercent: Math.round(priceChangePercent * 10) / 10,
            priceHistory: priceHistory.slice(0, 20), // 최근 20개만
          };

          logger.info("✅ 가격 예측 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 시장 평균가 기반 예측
          const currentPriceNum = currentPrice ? Number(currentPrice) : avgPrice || 0;
          const predictedPrice = avgPrice ? Math.round(avgPrice) : currentPriceNum;
          const priceChange = predictedPrice - currentPriceNum;
          const priceChangePercent = currentPriceNum > 0
            ? (priceChange / currentPriceNum) * 100
            : 0;

          result = {
            predictedPrice,
            trend: priceChange > 0 ? "up" : priceChange < 0 ? "down" : "stable",
            confidence: priceHistory.length > 0 ? 0.65 : 0.45,
            reason: avgPrice
              ? `시장 평균가 ${Math.round(avgPrice).toLocaleString()}원 기준으로 예측했습니다.`
              : "시장 데이터가 부족하여 정확한 예측이 어렵습니다.",
            priceChange: Math.round(priceChange),
            priceChangePercent: Math.round(priceChangePercent * 10) / 10,
            priceHistory: priceHistory.slice(0, 20),
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 가격 예측 오류:", aiError);

        // Fallback: 시장 평균가 기반 예측
        const currentPriceNum = currentPrice ? Number(currentPrice) : avgPrice || 0;
        const predictedPrice = avgPrice ? Math.round(avgPrice) : currentPriceNum;
        const priceChange = predictedPrice - currentPriceNum;
        const priceChangePercent = currentPriceNum > 0
          ? (priceChange / currentPriceNum) * 100
          : 0;

        res.json({
          predictedPrice,
          trend: priceChange > 0 ? "up" : priceChange < 0 ? "down" : "stable",
          confidence: priceHistory.length > 0 ? 0.60 : 0.40,
          reason: "AI 분석에 실패했습니다. 시장 평균가 기준으로 예측했습니다.",
          priceChange: Math.round(priceChange),
          priceChangePercent: Math.round(priceChangePercent * 10) / 10,
          priceHistory: priceHistory.slice(0, 20),
        });
      }
    } catch (e: any) {
      logger.error("🔥 가격 예측 서버 오류:", e);
      res.status(500).json({
        predictedPrice: null,
        trend: "stable",
        confidence: 0,
        reason: "서버 오류로 예측할 수 없습니다.",
        priceChange: 0,
        priceChangePercent: 0,
        priceHistory: [],
      });
    }
  }
);

