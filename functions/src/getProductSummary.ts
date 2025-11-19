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
 * AI 상품 요약 생성
 * - 상품명, 카테고리, 설명, 태그를 기반으로 핵심 요약 생성
 * - 구매자가 한눈에 이해할 수 있는 2~3줄 요약 제공
 */
export const getProductSummary = onRequest(
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
      const { name, category, description, tags, imageUrl } = req.body;

      if (!name) {
        res.json({ summary: "" });
        return;
      }

      logger.info("✨ 상품 요약 생성 요청:", { name, category });

      const prompt = `
너는 중고거래 플랫폼의 상품 요약 전문가야.

아래 상품 정보를 보고 구매자가 한눈에 이해하도록
2~3줄의 핵심 요약을 만들어줘.

### 정보
상품명: ${name || ""}
카테고리: ${category || ""}
설명: ${description || ""}
태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}

### 규칙
- 핵심 장점 또는 특징 위주
- 상태나 용도도 반영
- 너무 광고 문구처럼 금지
- 친절하고 간단한 톤
- 2~3문장으로 (최대 150자)
- 한국어로 자연스럽게 작성
- 구매자가 가장 먼저 알아야 하는 정보 중심

출력 형식(JSON만):
{
  "summary": "요약 내용"
}
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 상품 요약 전문가입니다. 상품 정보를 분석하여 구매자가 한눈에 이해할 수 있는 핵심 요약을 생성합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 200,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 상품 요약 결과:", aiText.substring(0, 100));

        // JSON 파싱
        let summary = "";
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
          
          summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
            ? parsed.summary.trim()
            : "";

          // 요약이 너무 길면 자르기 (150자 제한)
          if (summary.length > 150) {
            summary = summary.substring(0, 147) + "...";
          }

          logger.info("✅ 상품 요약 생성 완료:", summary.substring(0, 50));
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          
          // Fallback: 간단한 요약 생성
          const fallbackSummary = `${name || "이 상품"}은(는) ${category || "중고 상품"}으로, ${description ? description.substring(0, 50) + "..." : "상태 양호한 중고 상품"}입니다.`;
          summary = fallbackSummary;
        }

        res.json({ summary });
      } catch (aiError: any) {
        logger.error("❌ AI 상품 요약 생성 오류:", aiError);
        
        // Fallback: 기본 요약
        const fallbackSummary = `${name || "이 상품"}은(는) ${category || "중고 상품"}으로, 상태 양호한 중고 상품입니다.`;
        res.json({ summary: fallbackSummary });
      }
    } catch (e: any) {
      logger.error("🔥 상품 요약 서버 오류:", e);
      res.status(500).json({ summary: "" });
    }
  }
);

