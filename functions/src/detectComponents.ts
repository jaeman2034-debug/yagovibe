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
 * AI 구성품 분석 시스템
 * - 카테고리 기반 기본 구성품 목록 생성
 * - 이미지와 설명을 기반으로 각 구성품의 존재 여부 판단
 * - "있음/없음/판단불가" 상태 제공
 */
export const detectComponents = onRequest(
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
      const { category, description, imageUrl } = req.body;

      if (!category && !description) {
        res.json({
          components: [],
          summary: "카테고리 또는 설명이 필요합니다.",
        });
        return;
      }

      logger.info("🧰 AI 구성품 분석 요청:", { category });

      const prompt = `
너는 중고거래 플랫폼의 "구성품 분석 전문가"야.

아래 상품 정보를 보고 구성품 체크리스트를 생성해줘.

### 입력
- 카테고리: ${category || "미분류"}
- 설명: ${description || "설명 없음"}
- 이미지: ${imageUrl ? "있음" : "없음"}

### 단계
1. 해당 카테고리의 기본 구성품 리스트 만들기
   - 전자기기: 본체, 충전 케이블, 충전 어댑터, 박스, 설명서, 이어팁 등
   - 스포츠 용품: 본체, 케이스, 추가 부속품, 설명서, 박스 등
   - 의류/액세서리: 본체, 태그, 박스, 케이스 등
   - 기타: 카테고리에 맞는 일반적인 구성품

2. 이미지와 설명을 기반으로 각각이 있는지 판단
   - 이미지에서 명확히 보이면 "있음"
   - 설명에 명시되어 있으면 "있음"
   - 이미지나 설명에서 확인 불가능하면 "판단불가"
   - 설명에 "없음", "포함 안됨" 등이 명시되면 "없음"

3. "있음/없음/판단불가" 중 하나로 표시

4. JSON 형식으로만 출력

### 출력(JSON)
{
  "components": [
    { "name": "본체", "status": "있음" },
    { "name": "충전 케이블", "status": "판단불가" },
    { "name": "박스", "status": "없음" }
  ],
  "summary": "본체는 확인됨, 충전 케이블은 확인이 어려우며 박스는 없는 것으로 보입니다."
}

조건:
- components 배열에는 3~8개 정도의 주요 구성품만 포함
- status는 반드시 "있음", "없음", "판단불가" 중 하나
- summary는 1~2문장으로 간단히 요약
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 구성품 분석 전문가입니다. 이미지와 설명을 정확하게 분석하여 구성품 체크리스트를 생성합니다.",
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
          max_tokens: 600,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 구성품 분석 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          components: Array<{ name: string; status: "있음" | "없음" | "판단불가" }>;
          summary: string;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // components 검증 및 정규화
          const components = Array.isArray(parsed.components)
            ? parsed.components
                .map((c: any) => {
                  if (typeof c.name !== "string" || !c.name.trim()) return null;
                  const status = c.status === "있음" || c.status === "없음" || c.status === "판단불가"
                    ? c.status
                    : "판단불가";
                  return { name: c.name.trim(), status };
                })
                .filter((c: any) => c !== null)
                .slice(0, 10) // 최대 10개
            : [];

          const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
            ? parsed.summary.trim()
            : components.length > 0
            ? `${components.length}개 구성품을 분석했습니다.`
            : "구성품 분석을 완료했습니다.";

          result = { components, summary };
          logger.info("✅ AI 구성품 분석 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 구성품 리스트
          result = {
            components: [
              { name: "본체", status: "판단불가" },
            ],
            summary: "AI 분석에 실패했습니다.",
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 구성품 분석 오류:", aiError);
        // Fallback
        res.json({
          components: [
            { name: "본체", status: "판단불가" },
          ],
          summary: "AI 분석에 실패했습니다.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 구성품 분석 서버 오류:", e);
      res.status(500).json({
        components: [],
        summary: "서버 오류로 분석할 수 없습니다.",
      });
    }
  }
);

