import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * AI 가격 미래 예측 (1주/2주 후 예상 가격 범위)
 * - 현재 가격 + 상태 점수 + 이미지 품질 + 시세 데이터 기반
 * - 1주 후, 2주 후 예상 가격 범위(min~max) 제공
 */
export const predictFuturePrice = onRequest(
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
      const {
        name,
        category,
        description,
        price,
        conditionScore,
        imageQualityScore,
        historicalPrices,
      } = req.body;

      if (!name || !price) {
        res.json({
          oneWeek: null,
          twoWeeks: null,
          trend: "unknown",
          reason: "상품 정보가 부족하여 예측할 수 없습니다.",
        });
        return;
      }

      logger.info("📈 가격 미래 예측 요청:", { name, category, price });

      // historicalPrices 분석
      const priceStats = Array.isArray(historicalPrices) && historicalPrices.length > 0
        ? {
            count: historicalPrices.length,
            avg: historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length,
            min: Math.min(...historicalPrices),
            max: Math.max(...historicalPrices),
            recent: historicalPrices.slice(0, 10), // 최근 10개
          }
        : null;

      const marketContext = priceStats
        ? `
최근 시세 데이터:
- 유사 상품 ${priceStats.count}개
- 평균가: ${Math.round(priceStats.avg).toLocaleString()}원
- 최저가: ${Math.round(priceStats.min).toLocaleString()}원
- 최고가: ${Math.round(priceStats.max).toLocaleString()}원
- 최근 가격: ${priceStats.recent.map((p: number) => Math.round(p).toLocaleString()).join(", ")}원
`
        : "최근 시세 데이터: 없음";

      const prompt = `
너는 중고거래 시세 분석 전문가야.

아래 데이터 기반으로 1주 후와 2주 후의 예상 가격을 예측해줘.

### 상품 정보
- 상품명: ${name || ""}
- 카테고리: ${category || ""}
- 설명: ${description || ""}

### 현재 정보
- 현재 가격: ${Math.round(Number(price) || 0).toLocaleString()}원
- 상태 점수(0~1): ${conditionScore || 0.5}
- 이미지 품질 점수(0~1): ${imageQualityScore || 0.5}

${marketContext}

### 규칙
- 중고 시세는 보통 완만하게 떨어지므로 하락 추세가 일반적임
- 거래량이 적으면 예측 정확도 낮음
- 상태 점수가 높다면(0.7 이상) 시세가 유지/상승 가능
- 이미지 품질이 높으면(0.7 이상) 신뢰도 상승으로 가격 유지 가능
- 가격 예측은 단일 숫자가 아니라 범위(min~max)로 반환
- 1주 후보다 2주 후가 더 넓은 범위를 가짐
- 현재 가격 기준으로 ±5~15% 범위 내에서 예측

### 출력 형식(JSON만):
{
  "oneWeek": { "min": 숫자, "max": 숫자 },
  "twoWeeks": { "min": 숫자, "max": 숫자 },
  "trend": "상승 | 보합 | 하락",
  "reason": "요약 설명 (한국어로 1~2문장)"
}

조건:
- oneWeek.min < oneWeek.max
- twoWeeks.min < twoWeeks.max
- twoWeeks 범위가 oneWeek보다 넓어야 함
- trend는 "상승", "보합", "하락" 중 하나
- 반드시 유효한 JSON만 출력

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 시세 분석 전문가입니다. 시세 데이터와 상품 정보를 분석하여 정확한 가격 변동을 예측합니다.",
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
        logger.info("🤖 AI 가격 미래 예측 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          oneWeek: { min: number; max: number } | null;
          twoWeeks: { min: number; max: number } | null;
          trend: string;
          reason: string;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const currentPrice = Number(price) || 0;

          // 1주 후 예상 가격 범위
          let oneWeek: { min: number; max: number } | null = null;
          if (parsed.oneWeek && typeof parsed.oneWeek.min === "number" && typeof parsed.oneWeek.max === "number") {
            oneWeek = {
              min: Math.round(Math.max(0, parsed.oneWeek.min)),
              max: Math.round(Math.max(parsed.oneWeek.min, parsed.oneWeek.max)),
            };
          } else {
            // Fallback: 현재 가격 기준 ±10%
            oneWeek = {
              min: Math.round(currentPrice * 0.9),
              max: Math.round(currentPrice * 1.1),
            };
          }

          // 2주 후 예상 가격 범위
          let twoWeeks: { min: number; max: number } | null = null;
          if (parsed.twoWeeks && typeof parsed.twoWeeks.min === "number" && typeof parsed.twoWeeks.max === "number") {
            twoWeeks = {
              min: Math.round(Math.max(0, parsed.twoWeeks.min)),
              max: Math.round(Math.max(parsed.twoWeeks.min, parsed.twoWeeks.max)),
            };
          } else {
            // Fallback: 현재 가격 기준 ±15%
            twoWeeks = {
              min: Math.round(currentPrice * 0.85),
              max: Math.round(currentPrice * 1.15),
            };
          }

          // 2주 후 범위가 1주 후보다 넓어야 함
          if (twoWeeks && oneWeek) {
            const oneWeekRange = oneWeek.max - oneWeek.min;
            const twoWeeksRange = twoWeeks.max - twoWeeks.min;
            if (twoWeeksRange < oneWeekRange) {
              const center = (twoWeeks.min + twoWeeks.max) / 2;
              const expandedRange = oneWeekRange * 1.2;
              twoWeeks = {
                min: Math.round(center - expandedRange / 2),
                max: Math.round(center + expandedRange / 2),
              };
            }
          }

          const trend = parsed.trend === "상승" || parsed.trend === "보합" || parsed.trend === "하락"
            ? parsed.trend
            : "보합";

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : "시세 데이터를 기반으로 예측했습니다.";

          result = { oneWeek, twoWeeks, trend, reason };
          logger.info("✅ 가격 미래 예측 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 현재 가격 기준 기본 범위
          const currentPrice = Number(price) || 0;
          result = {
            oneWeek: {
              min: Math.round(currentPrice * 0.9),
              max: Math.round(currentPrice * 1.1),
            },
            twoWeeks: {
              min: Math.round(currentPrice * 0.85),
              max: Math.round(currentPrice * 1.15),
            },
            trend: "보합",
            reason: "시세 데이터 분석에 실패했습니다. 현재 가격 기준으로 예측했습니다.",
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 가격 미래 예측 오류:", aiError);

        // Fallback: 기본 범위
        const currentPrice = Number(price) || 0;
        res.json({
          oneWeek: {
            min: Math.round(currentPrice * 0.9),
            max: Math.round(currentPrice * 1.1),
          },
          twoWeeks: {
            min: Math.round(currentPrice * 0.85),
            max: Math.round(currentPrice * 1.15),
          },
          trend: "보합",
          reason: "AI 분석에 실패했습니다. 현재 가격 기준으로 예측했습니다.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 가격 미래 예측 서버 오류:", e);
      res.status(500).json({
        oneWeek: null,
        twoWeeks: null,
        trend: "unknown",
        reason: "서버 오류로 예측할 수 없습니다.",
      });
    }
  }
);

