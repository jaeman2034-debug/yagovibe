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
 * AI 제목 생성 시스템
 * - 상품명 + 이미지 + 설명 기반으로 클릭율 높은 제목 생성
 * - 상태/구성품/특징 반영
 * - 검색 최적화 태그 자동 포함
 */
export const generateProductTitle = onRequest(
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
        conditionScore,
        imageQualityScore,
        tags,
        imageUrl,
      } = req.body;

      if (!name && !description) {
        res.json({ title: name || "상품" });
        return;
      }

      logger.info("📝 AI 제목 생성 요청:", { name, category });

      const prompt = `
너는 중고거래 플랫폼의 "클릭율 높은 상품 제목 생성 전문가"야.

아래 정보를 참고해 *5~20자 사이*의 최적 제목을 1개 만들어줘.

### 입력
상품명: ${name || ""}
카테고리: ${category || ""}
설명: ${description || ""}
태그: ${Array.isArray(tags) && tags.length > 0 ? tags.join(", ") : "없음"}
상태 점수: ${conditionScore || 0.5}
이미지 품질 점수: ${imageQualityScore || 0.5}
이미지: ${imageUrl ? "있음" : "없음"}

### 제목 규칙
1. 핵심 특징 1~2개만 포함 (예: 상/중/하, 용량, 모델명, 구성품)
2. 광고 문구 금지 (초특가, 미친 가격 등)
3. '상태 좋음', '생활기스 없음' 같은 구체적 표현 O
4. 괄호/대괄호 활용 가능
5. 검색 최적화 (모델명·색상 포함)
6. 너무 길면 안됨 (5~20자)
7. **JSON만 출력하기**

### 출력(JSON)
{
  "title": "생성된 제목"
}

조건:
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
- 제목은 5~20자 사이
- 한국어로 작성
- 검색 최적화를 고려한 자연스러운 제목
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 클릭율 높은 상품 제목 생성 전문가입니다. 요청된 JSON 형식으로만 응답합니다.",
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
          max_tokens: 200,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 제목 생성 결과:", aiText.substring(0, 100));

        // JSON 파싱
        let result: { title: string };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const generatedTitle = typeof parsed.title === "string" && parsed.title.trim().length > 0
            ? parsed.title.trim()
            : name || "상품";

          // 제목 길이 검증 (5~20자)
          const finalTitle = generatedTitle.length > 20
            ? generatedTitle.substring(0, 20)
            : generatedTitle.length < 5
            ? generatedTitle + " (상태 좋음)"
            : generatedTitle;

          result = { title: finalTitle };
          logger.info("✅ AI 제목 생성 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 제목
          result = { title: name || "상품" };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 제목 생성 오류:", aiError);
        // Fallback: 기본 제목
        res.json({ title: name || "상품" });
      }
    } catch (e: any) {
      logger.error("🔥 제목 생성 서버 오류:", e);
      res.status(500).json({ title: req.body?.name || "상품" });
    }
  }
);

