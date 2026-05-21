import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getOpenAIClient } from "./lib/openaiClient";
import type OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

/**
 * AI 태그 생성 시스템 (검색 최적화)
 * - 상품명 + 이미지 + 설명 기반으로 검색에 최적화된 태그 생성
 * - 모델명, 브랜드, 색상, 용도, 핵심 기능 포함
 * - SEO 최적화 형식 (5~12개 태그)
 */
export const generateAITags = onRequest(
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
      const openai = getOpenAIClient();
      const {
        name,
        category,
        description,
        conditionScore,
        imageQualityScore,
        imageUrl,
      } = req.body;

      if (!name && !description && !imageUrl) {
        res.json({ tags: [] });
        return;
      }

      logger.info("🏷️ AI 태그 생성 요청:", { name, category });

      const prompt = `
너는 중고거래 플랫폼의 "상품 태그 생성 전문가"야.

아래 상품 정보를 보고 검색에 최적화된 태그를 5~12개 생성해줘.

### 입력
- 상품명: ${name || ""}
- 카테고리: ${category || ""}
- 설명: ${description || ""}
- 상태 점수: ${conditionScore || 0.5}
- 이미지 품질 점수: ${imageQualityScore || 0.5}
- 이미지 있음: ${imageUrl ? "예" : "아니오"}

### 규칙
1. 모델명 / 브랜드 / 색상 / 용도 / 핵심 기능 포함
2. 너무 일반적인 태그 금지 (예: "중고", "판매", "상품")
3. 광고성 단어 금지 (예: "초특가", "미친가격")
4. SEO 최적화 형식 (단어 1~2개 단위)
5. 숫자·단위·사이즈 가능 (예: "44mm", "21단", "A급")
6. 한국어 기준
7. JSON만 출력하도록

### 출력 예시
{
  "tags": ["갤럭시워치4", "44mm", "스페이스그레이", "삼성", "스포츠밴드", "시리즈6", "애플워치"]
}

조건:
- tags 배열에는 5~12개의 태그 포함
- 각 태그는 1~3단어로 구성
- 검색에 유용한 구체적인 키워드만 포함
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 검색 최적화 태그 생성 전문가입니다. 요청된 JSON 형식으로만 응답합니다.",
        },
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ];

      // 이미지 URL이 있으면 Vision API 사용
      if (imageUrl) {
        messages[1].content = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ];
      }

      try {
        const aiResp = await openai.chat.completions.create({
          model: imageUrl ? "gpt-4o" : "gpt-4o-mini", // 이미지 있으면 gpt-4o Vision 사용
          messages: messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 400,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 태그 생성 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: { tags: string[] };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // tags 검증 및 정규화
          const tags = Array.isArray(parsed.tags)
            ? parsed.tags
                .map((t: any) => typeof t === "string" ? t.trim() : String(t).trim())
                .filter((t: string) => t.length > 0 && t.length <= 20) // 1~20자 태그만
                .slice(0, 12) // 최대 12개
            : [];

          result = { tags };
          logger.info("✅ AI 태그 생성 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 태그
          result = { tags: category ? [category] : [] };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 태그 생성 오류:", aiError);
        // Fallback
        res.json({ tags: category ? [category] : [] });
      }
    } catch (e: any) {
      logger.error("🔥 태그 생성 서버 오류:", e);
      res.status(500).json({ tags: [] });
    }
  }
);

