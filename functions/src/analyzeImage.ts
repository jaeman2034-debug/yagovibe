import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import fetch from "node-fetch";

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Step 4: AI 이미지 분석 함수
 * 이미지 URL을 받아서 OpenAI Vision API로 분석하고,
 * 상품 카테고리, 태그, 추천 가격을 반환합니다.
 */
export const analyzeImage = onRequest(
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

      const { imageUrl } = req.body;

      if (!imageUrl) {
        res.status(400).json({ error: "imageUrl required" });
        return;
      }

      logger.info("🔍 이미지 분석 시작:", imageUrl);

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 시뮬레이션 모드로 동작");
        // 시뮬레이션 응답 반환
        const aiTags = ["운동화", "축구", "나이키", "스포츠"];
        const suggestedPrice = 87000;
        const category = "축구용품";

        return res.json({
          aiTags,
          suggestedPrice,
          category,
          mode: "simulation",
        });
      }

      // 🔹 OpenAI Vision API 호출
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `당신은 스포츠용품 전문가입니다. 이미지를 분석하여 다음 정보를 JSON 형식으로 제공하세요:
              - category: 상품 카테고리 (예: "축구용품", "농구용품", "테니스용품" 등)
              - aiTags: 상품을 설명하는 태그 배열 (예: ["축구화", "나이키", "프로용", "내구성"])
              - suggestedPrice: 중고 시장 기준 합리적 가격 (숫자만, 단위: 원)
              응답은 반드시 JSON 형식이어야 합니다.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "이 스포츠용품 이미지를 분석하고, 카테고리, 태그, 추천 가격을 JSON 형식으로 제공해주세요. 형식: {\"category\":\"카테고리명\",\"aiTags\":[\"태그1\",\"태그2\"],\"suggestedPrice\":숫자}",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || "";
        logger.info("🤖 OpenAI 응답:", content);

        // JSON 파싱 시도
        let result;
        try {
          // JSON 코드 블록이 있는 경우 추출
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(content);
          }
        } catch (parseError) {
          logger.warn("⚠️ JSON 파싱 실패, 기본값 사용:", parseError);
          // 파싱 실패 시 기본값
          result = {
            category: "스포츠용품",
            aiTags: ["스포츠", "용품"],
            suggestedPrice: 50000,
          };
        }

        const aiTags = result.aiTags || [];
        const suggestedPrice = result.suggestedPrice || 50000;
        const category = result.category || "스포츠용품";

        logger.info("✅ 분석 완료:", { aiTags, suggestedPrice, category });

        res.json({
          aiTags,
          suggestedPrice,
          category,
          mode: "openai",
        });
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        // OpenAI 오류 시 시뮬레이션 응답
        const aiTags = ["운동화", "축구", "나이키", "스포츠"];
        const suggestedPrice = 87000;
        const category = "축구용품";

        res.json({
          aiTags,
          suggestedPrice,
          category,
          mode: "fallback",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 이미지 분석 함수 오류:", error);
      res.status(500).json({
        error: "AI 분석 실패",
        message: error.message,
      });
    }
  }
);

