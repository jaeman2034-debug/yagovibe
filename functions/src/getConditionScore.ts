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
 * AI 상품 상태 점수 계산
 * - 이미지, 설명, 태그, 카테고리를 기반으로 상품 상태 평가
 * - 스크래치, 구성품, 사용감 등을 종합 분석하여 "상/중/하" 등급 판정
 */
export const getConditionScore = onRequest(
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
      const { description, imageUrl, category, tags } = req.body;

      if (!description && !imageUrl) {
        res.json({
          score: 0.5,
          level: "중",
          reason: "상품 정보가 부족하여 정확한 상태 평가가 어렵습니다.",
        });
        return;
      }

      logger.info("🧩 상품 상태 평가 요청:", { category, hasImage: !!imageUrl });

      const prompt = `
너는 중고거래 플랫폼의 "상품 상태 평가 전문가"야.

아래 정보를 기반으로 상품의 상태를
0~1 점수로 평가하고 "상/중/하" 등급으로 분류해줘.

### 입력 정보
- 카테고리: ${category || ""}
- 설명: ${description || ""}
- 태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}
- 이미지: ${imageUrl ? "있음" : "없음"}

### 평가 기준
1. 스크래치, 찌그러짐, 파손 여부
2. 구성품 누락 여부 (포함 여부 명시)
3. 실사용감 (버튼 닳음, 모서리 까짐, 마모도 등)
4. 전자기기는 화면 상태/배터리 등 간접 판단
5. 설명의 신뢰도 (설명이 너무 짧거나 모호하면 감점)
6. 이미지의 품질 (blur/noise가 심하면 상태 확인 어려움으로 감점)
7. 외관 상태 (깨끗함, 생활기스, 얼룩 등)
8. 기능 정상 작동 여부 (설명 기반 추론)

### 출력 형식(JSON만):
{
  "score": 0.0~1.0,
  "level": "상 | 중 | 하",
  "reason": "상태에 대한 간단한 이유 (한국어로 1~2문장)"
}

### 등급 기준
- 0.0 ~ 0.4: 하 (심각한 손상, 파손, 사용감 많음)
- 0.4 ~ 0.7: 중 (일반적인 사용감, 작은 스크래치, 구성품 일부 누락)
- 0.7 ~ 1.0: 상 (깨끗함, 생활기스 없음, 구성품 완비, 거의 새것)

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

      try {
        const messages: any[] = [
          {
            role: "system",
            content: "당신은 중고거래 플랫폼의 상품 상태 평가 전문가입니다. 이미지와 설명을 분석하여 상품의 상태를 정확하게 평가합니다.",
          },
        ];

        // 이미지가 있으면 Vision API 사용, 없으면 텍스트만
        if (imageUrl) {
          messages.push({
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          });
        } else {
          messages.push({
            role: "user",
            content: prompt,
          });
        }

        const aiResp = await openai.chat.completions.create({
          model: imageUrl ? "gpt-4o" : "gpt-4o-mini", // 이미지가 있으면 GPT-4o, 없으면 GPT-4o-mini
          messages,
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 300,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 상품 상태 평가 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: { score: number; level: string; reason: string };
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const score = typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 1
            ? parsed.score
            : 0.5;

          let level = "중";
          if (score >= 0.7) {
            level = "상";
          } else if (score < 0.4) {
            level = "하";
          }

          // parsed.level이 있으면 우선 사용
          if (parsed.level === "상" || parsed.level === "중" || parsed.level === "하") {
            level = parsed.level;
          }

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : score >= 0.7
            ? "상태가 매우 양호하며 생활기스가 거의 없습니다."
            : score >= 0.4
            ? "일반적인 사용감이 있으며 상태는 보통입니다."
            : "사용감이 많거나 손상이 있는 것으로 보입니다.";

          result = { score, level, reason };
          logger.info("✅ 상품 상태 평가 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 간단한 상태 평가
          let score = 0.5;
          let level = "중";
          let reason = "상태 평가에 실패했습니다. 직접 확인해주세요.";

          // 설명 기반 간단한 추론
          if (description) {
            const descLower = description.toLowerCase();
            if (descLower.includes("새것") || descLower.includes("미사용") || descLower.includes("미개봉")) {
              score = 0.9;
              level = "상";
              reason = "설명상 새것 또는 미사용 상태로 보입니다.";
            } else if (descLower.includes("파손") || descLower.includes("고장") || descLower.includes("손상")) {
              score = 0.2;
              level = "하";
              reason = "설명상 파손 또는 손상이 있는 것으로 보입니다.";
            } else if (descLower.includes("양호") || descLower.includes("깨끗")) {
              score = 0.7;
              level = "상";
              reason = "설명상 상태가 양호한 것으로 보입니다.";
            }
          }

          result = { score, level, reason };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 상품 상태 평가 오류:", aiError);

        // Fallback: 기본 상태
        res.json({
          score: 0.5,
          level: "중",
          reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 상품 상태 평가 서버 오류:", e);
      res.status(500).json({
        score: 0.5,
        level: "중",
        reason: "서버 오류로 분석할 수 없습니다.",
      });
    }
  }
);

