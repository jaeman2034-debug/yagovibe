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
 * AI 카테고리 자동 분류 시스템
 * - 이미지 + 제목 + 설명 기반으로 정확한 카테고리 추천
 * - 1~3개의 후보 카테고리 제시
 */
export const generateCategory = onRequest(
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
      const { name, description, imageUrl } = req.body;

      if (!name && !description && !imageUrl) {
        res.json({ categories: [] });
        return;
      }

      logger.info("📂 AI 카테고리 자동 분류 요청:", { name });

      const prompt = `
너는 중고거래 플랫폼의 "AI 카테고리 자동 분류 전문가"야.

아래 상품 정보를 보고 가장 적합한 카테고리 1~3개를 추천해줘.

### 입력
- 상품명: ${name || ""}
- 설명: ${description || ""}
- 이미지 있음: ${imageUrl ? "예" : "아니오"}

### 카테고리 목록 (YAGO VIBE 기준)
- 휴대폰·스마트폰
- 태블릿
- 노트북·PC
- 모니터
- 키보드·마우스
- 이어폰·헤드폰
- 스마트워치·웨어러블
- 카메라·렌즈
- 생활가전
- 주방가전
- 가구
- 운동기구
- 자전거
- 스쿠터·킥보드
- 의류·패션
- 신발
- 가방·잡화
- 장난감
- 취미·공구
- 기타

### 규칙
1. 이미지+텍스트 기반으로 가장 확률 높은 카테고리 추천
2. 최대 3개까지 추천 (가장 적합한 것부터 순서대로)
3. 정확한 카테고리명만 사용 (위 목록에 있는 것만)
4. JSON만 출력

### 출력 예시(JSON):
{
  "categories": [
    "스마트워치·웨어러블",
    "휴대폰·스마트폰"
  ]
}

조건:
- categories 배열에는 1~3개의 카테고리만 포함
- 위 목록에 있는 정확한 카테고리명만 사용
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 카테고리 자동 분류 전문가입니다. 이미지와 텍스트를 분석하여 정확한 카테고리를 추천합니다.",
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
          temperature: 0.3,
          max_tokens: 300,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 카테고리 분류 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: { categories: string[] };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 카테고리 목록 (정확한 이름만 허용)
          const validCategories = [
            "휴대폰·스마트폰",
            "태블릿",
            "노트북·PC",
            "모니터",
            "키보드·마우스",
            "이어폰·헤드폰",
            "스마트워치·웨어러블",
            "카메라·렌즈",
            "생활가전",
            "주방가전",
            "가구",
            "운동기구",
            "자전거",
            "스쿠터·킥보드",
            "의류·패션",
            "신발",
            "가방·잡화",
            "장난감",
            "취미·공구",
            "기타",
          ];

          // categories 검증 및 정규화
          const categories = Array.isArray(parsed.categories)
            ? parsed.categories
                .map((c: any) => {
                  const cat = String(c).trim();
                  // 정확히 일치하는 카테고리 찾기
                  const matched = validCategories.find((vc) => vc === cat || vc.includes(cat) || cat.includes(vc));
                  return matched || null;
                })
                .filter((c: string | null): c is string => c !== null)
                .slice(0, 3) // 최대 3개
            : [];

          // 매칭이 안 되면 "기타" 추가
          if (categories.length === 0) {
            categories.push("기타");
          }

          result = { categories };
          logger.info("✅ AI 카테고리 분류 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 카테고리
          result = { categories: ["기타"] };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 카테고리 분류 오류:", aiError);
        // Fallback
        res.json({ categories: ["기타"] });
      }
    } catch (e: any) {
      logger.error("🔥 카테고리 분류 서버 오류:", e);
      res.status(500).json({ categories: ["기타"] });
    }
  }
);

