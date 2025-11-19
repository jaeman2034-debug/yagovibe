import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Step 7: AI 리뷰 분석 함수
 * 리뷰 목록을 받아서 OpenAI로 감정 분석, 키워드 추출, 요약 생성
 */
export const analyzeReviews = onRequest(
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

      const { reviews } = req.body;

      if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
        res.status(400).json({ error: "no reviews provided" });
        return;
      }

      logger.info("📊 리뷰 분석 시작:", { reviewCount: reviews.length });

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 시뮬레이션 모드로 동작");
        
        // 시뮬레이션 응답
        const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 3), 0) / reviews.length;
        
        return res.json({
          averageScore: Math.round(avgRating * 10) / 10,
          keywords: ["가성비", "품질", "배송", "색상", "추천"],
          summary: "대부분 긍정적이며 가성비와 품질이 좋다는 평가",
          sentiment: {
            positive: 60,
            neutral: 30,
            negative: 10,
          },
          mode: "simulation",
        });
      }

      try {
        // 리뷰 텍스트 추출
        const texts = reviews.map((r: any) => {
          const text = r.text || "";
          const rating = r.rating || 0;
          return `[${rating}점] ${text}`;
        }).join("\n");

        const prompt = `다음 사용자 리뷰들을 읽고 다음 정보를 JSON 형태로 요약해줘:

리뷰 목록:
${texts}

다음 정보를 추출해줘:
1. averageScore: 전체 감정 점수 (1-5 평균, 소수점 첫째자리까지)
2. keywords: 핵심 키워드 5개 (배열)
3. summary: 한 문장 요약 (긍정/부정 비율 포함)
4. sentiment: 감정 분포 (긍정/중립/부정 비율, 합계 100%)

출력 형식:
{
  "averageScore": 4.3,
  "keywords": ["가성비", "품질", "배송", "색상", "추천"],
  "summary": "대부분 긍정적이며 가성비와 품질이 좋다는 평가가 많음. 평균 4.3점으로 만족도가 높음",
  "sentiment": {
    "positive": 65,
    "neutral": 25,
    "negative": 10
  }
}

반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 고객 리뷰 분석 전문가입니다. 리뷰를 정확히 분석하여 감정 점수, 키워드, 요약을 제공합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
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
          
          // Fallback: 리뷰 평점으로 계산
          const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 3), 0) / reviews.length;
          const positiveCount = reviews.filter((r: any) => (r.rating || 0) >= 4).length;
          const negativeCount = reviews.filter((r: any) => (r.rating || 0) <= 2).length;
          
          result = {
            averageScore: Math.round(avgRating * 10) / 10,
            keywords: ["품질", "배송", "가격", "서비스", "만족"],
            summary: "리뷰 분석 결과",
            sentiment: {
              positive: Math.round((positiveCount / reviews.length) * 100),
              neutral: Math.round(((reviews.length - positiveCount - negativeCount) / reviews.length) * 100),
              negative: Math.round((negativeCount / reviews.length) * 100),
            },
          };
        }

        // 필수 필드 확인 및 기본값 설정
        const finalResult = {
          averageScore: result.averageScore || 0,
          keywords: result.keywords || [],
          summary: result.summary || "요약 없음",
          sentiment: result.sentiment || {
            positive: 50,
            neutral: 30,
            negative: 20,
          },
          mode: "openai",
        };

        logger.info("✅ 리뷰 분석 완료:", finalResult);

        res.json(finalResult);
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        
        // OpenAI 오류 시 기본값 반환
        const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 3), 0) / reviews.length;
        
        res.json({
          averageScore: Math.round(avgRating * 10) / 10,
          keywords: ["품질", "배송", "가격", "서비스", "만족"],
          summary: "리뷰 분석 중 오류가 발생했습니다",
          sentiment: {
            positive: 50,
            neutral: 30,
            negative: 20,
          },
          mode: "fallback",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 리뷰 분석 함수 오류:", error);
      res.status(500).json({
        error: "리뷰 분석 실패",
        message: error.message,
      });
    }
  }
);

