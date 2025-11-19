import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Step 9: AI 판매 예측 함수
 * 상품별 통계 데이터를 기반으로 다음 주 판매량을 예측하고, 인기 상품을 분석
 */
export const forecastSales = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
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

      const { stats } = req.body;

      if (!stats || !Array.isArray(stats) || stats.length === 0) {
        res.status(400).json({ error: "No stats data provided" });
        return;
      }

      logger.info("📊 판매 예측 시작:", { productCount: stats.length });

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 시뮬레이션 모드로 동작");
        
        // 시뮬레이션 응답
        const totalSales = stats.reduce((sum: number, s: any) => {
          const avgSales = Array.isArray(s.sales) 
            ? s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length
            : s.sales || 10;
          return sum + avgSales * 1.1; // 10% 증가 예측
        }, 0);

        const topProducts = stats
          .map((s: any) => {
            const avgSales = Array.isArray(s.sales)
              ? s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length
              : s.sales || 10;
            return {
              name: s.name || s.productId || "상품",
              predictedSales: Math.round(avgSales * 1.1),
              confidence: 75,
              trend: "up",
            };
          })
          .sort((a: any, b: any) => b.predictedSales - a.predictedSales)
          .slice(0, 5);

        return res.json({
          weekly: [
            { week: "11월 1주", sales: Math.round(totalSales * 0.3), historical: Math.round(totalSales * 0.25) },
            { week: "11월 2주", sales: Math.round(totalSales * 0.35), historical: Math.round(totalSales * 0.3) },
            { week: "11월 3주", sales: Math.round(totalSales * 0.2), historical: Math.round(totalSales * 0.25) },
            { week: "11월 4주", sales: Math.round(totalSales * 0.15), historical: Math.round(totalSales * 0.2) },
          ],
          topProducts,
          totalForecast: Math.round(totalSales),
          topProduct: topProducts[0]?.name || "없음",
          confidence: 75,
          summary: "시뮬레이션 모드: 과거 데이터를 기반으로 10% 증가 예측",
          mode: "simulation",
        });
      }

      try {
        // AI 예측 요청
        const prompt = `다음 JSON은 각 상품의 주간 통계 데이터입니다.
각 상품의 판매량(sales), 클릭수(clicks), 리뷰수(reviews), 평점(rating)을 기반으로
다음 주 판매량을 예측하고, 가장 인기 있을 상품을 알려줘.

데이터:
${JSON.stringify(stats, null, 2)}

다음 형식으로 JSON을 반환해줘:
{
  "weekly": [
    {"week": "11월 1주", "sales": 숫자, "historical": 숫자},
    {"week": "11월 2주", "sales": 숫자, "historical": 숫자},
    {"week": "11월 3주", "sales": 숫자, "historical": 숫자},
    {"week": "11월 4주", "sales": 숫자, "historical": 숫자}
  ],
  "topProducts": [
    {"name": "상품명", "predictedSales": 숫자, "confidence": 0-100, "trend": "up|down|stable"}
  ],
  "totalForecast": 숫자,
  "topProduct": "상품명",
  "confidence": 0-100,
  "summary": "한 문단 요약 (트렌드 설명 포함)"
}

중요:
- sales는 배열일 수도 있고 숫자일 수도 있음
- historical는 과거 평균 판매량
- trend는 "up" (상승), "down" (하락), "stable" (보통)
- confidence는 예측 신뢰도 (0-100)
- 반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 판매 예측 전문가입니다. 과거 데이터를 분석하여 정확한 판매량 예측과 트렌드 분석을 제공합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const jsonText = aiResponse.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 응답:", jsonText);

        // JSON 파싱
        let result;
        try {
          // JSON 코드 블록이 있는 경우 추출
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(jsonText);
          }
        } catch (parseError) {
          logger.error("❌ JSON 파싱 실패:", parseError);
          
          // Fallback: 기본 계산
          const totalSales = stats.reduce((sum: number, s: any) => {
            const avgSales = Array.isArray(s.sales)
              ? s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length
              : s.sales || 10;
            return sum + avgSales * 1.05;
          }, 0);

          const topProducts = stats
            .map((s: any) => {
              const avgSales = Array.isArray(s.sales)
                ? s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length
                : s.sales || 10;
              return {
                name: s.name || s.productId || "상품",
                predictedSales: Math.round(avgSales * 1.05),
                confidence: 70,
                trend: "stable",
              };
            })
            .sort((a: any, b: any) => b.predictedSales - a.predictedSales)
            .slice(0, 5);

          result = {
            weekly: [
              { week: "11월 1주", sales: Math.round(totalSales * 0.3), historical: Math.round(totalSales * 0.28) },
              { week: "11월 2주", sales: Math.round(totalSales * 0.35), historical: Math.round(totalSales * 0.32) },
              { week: "11월 3주", sales: Math.round(totalSales * 0.2), historical: Math.round(totalSales * 0.22) },
              { week: "11월 4주", sales: Math.round(totalSales * 0.15), historical: Math.round(totalSales * 0.18) },
            ],
            topProducts,
            totalForecast: Math.round(totalSales),
            topProduct: topProducts[0]?.name || "없음",
            confidence: 70,
            summary: "기본 계산 모드: 과거 데이터를 기반으로 5% 증가 예측",
          };
        }

        // 필수 필드 확인 및 기본값 설정
        const finalResult = {
          weekly: result.weekly || [],
          topProducts: result.topProducts || [],
          totalForecast: result.totalForecast || 0,
          topProduct: result.topProduct || "없음",
          confidence: result.confidence || 70,
          summary: result.summary || "판매 예측 분석 완료",
          mode: "openai",
        };

        logger.info("✅ 판매 예측 완료:", finalResult);

        res.json(finalResult);
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        
        // OpenAI 오류 시 기본값 반환
        const totalSales = stats.reduce((sum: number, s: any) => {
          const avgSales = Array.isArray(s.sales)
            ? s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length
            : s.sales || 10;
          return sum + avgSales;
        }, 0);

        const topProducts = stats
          .map((s: any) => ({
            name: s.name || s.productId || "상품",
            predictedSales: Array.isArray(s.sales)
              ? Math.round(s.sales.reduce((a: number, b: number) => a + b, 0) / s.sales.length)
              : s.sales || 10,
            confidence: 60,
            trend: "stable",
          }))
          .sort((a: any, b: any) => b.predictedSales - a.predictedSales)
          .slice(0, 5);

        res.json({
          weekly: [
            { week: "11월 1주", sales: Math.round(totalSales * 0.3), historical: Math.round(totalSales * 0.3) },
            { week: "11월 2주", sales: Math.round(totalSales * 0.35), historical: Math.round(totalSales * 0.35) },
            { week: "11월 3주", sales: Math.round(totalSales * 0.2), historical: Math.round(totalSales * 0.2) },
            { week: "11월 4주", sales: Math.round(totalSales * 0.15), historical: Math.round(totalSales * 0.15) },
          ],
          topProducts,
          totalForecast: Math.round(totalSales),
          topProduct: topProducts[0]?.name || "없음",
          confidence: 60,
          summary: "기본 계산 모드로 예측했습니다",
          mode: "fallback",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 판매 예측 함수 오류:", error);
      res.status(500).json({
        error: "판매 예측 실패",
        message: error.message,
      });
    }
  }
);

