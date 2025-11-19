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
 * AI 한줄 요약 생성 시스템
 * - 상품 리스트 카드에 표시할 20자 이내 핵심 요약 생성
 * - 상태, 구성품, 사기 위험 등을 종합하여 요약
 */
export const generateOneLineSummary = onRequest(
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
        description,
        category,
        conditionScore,
        imageQualityScore,
        components,
        fraud,
        imageUrl,
      } = req.body;

      if (!name && !description) {
        res.json({ summary: "" });
        return;
      }

      logger.info("📝 AI 한줄 요약 생성 요청:", { name });

      // 구성품 정보 정리
      const componentsInfo = Array.isArray(components) && components.length > 0
        ? components
            .filter((c: any) => c.status === "있음")
            .map((c: any) => c.name)
            .slice(0, 3)
            .join(", ")
        : "";

      const prompt = `
너는 중고 거래 플랫폼의 "상품 리스트용 한줄 요약 생성 전문가"야.

아래 정보를 바탕으로 **20자 이내**의 리스트용 핵심 요약 하나를 생성해줘.

### 입력
상품명: ${name || ""}
카테고리: ${category || ""}
설명: ${description || ""}
상태 점수: ${conditionScore || 0.5}
이미지 품질: ${imageQualityScore || 0.5}
구성품: ${componentsInfo || "정보 없음"}
사기 위험: ${fraud?.label || "low"}
이미지 있음: ${imageUrl ? "예" : "아니오"}

### 규칙
- 너무 긴 문장 금지 (20자 이내, 최대 25자)
- 핵심 특징 1~3개만 포함
- 과장/광고 문구 금지 (초특가, 미친가격 등 금지)
- 상태가 좋다면 (0.7 이상) '상태좋음/양호/A급' 포함
- 구성품이 풍부하면 (3개 이상) '풀구성' 또는 '구성품완비' 포함
- 사기 위험이 HIGH면 '주의 필요' 포함하지 말고, 상태 점수만 반영
- 숫자/사이즈/색상 등 구체적 정보 우선 포함
- 슬래시(/) 또는 중점(·)으로 구분 가능

### 출력 예시
- "A급 상태 / 구성품 모두 포함 / 배터리 양호"
- "생활기스 거의 없음 / 당일 거래 가능"
- "44mm / 스페이스그레이 / 상태 상급"
- "상태 양호 / 풀구성 / 박스 있음"

### 출력(JSON):
{
  "summary": "한줄 요약"
}

조건:
- summary는 20자 이내 (최대 25자)
- 핵심 정보만 간결하게
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 상품 리스트용 한줄 요약 생성 전문가입니다. 20자 이내로 핵심 정보를 간결하게 요약합니다.",
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
          temperature: 0.5,
          max_tokens: 150,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 한줄 요약 결과:", aiText.substring(0, 100));

        // JSON 파싱
        let result: { summary: string };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
            ? parsed.summary.trim()
            : "";

          // 길이 검증 (25자 이내로 제한)
          const finalSummary = summary.length > 25
            ? summary.substring(0, 22) + "..."
            : summary;

          result = { summary: finalSummary };
          logger.info("✅ AI 한줄 요약 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 요약
          result = { summary: "" };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 한줄 요약 오류:", aiError);
        // Fallback
        res.json({ summary: "" });
      }
    } catch (e: any) {
      logger.error("🔥 한줄 요약 서버 오류:", e);
      res.status(500).json({ summary: "" });
    }
  }
);

