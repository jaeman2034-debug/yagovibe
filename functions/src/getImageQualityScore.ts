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
 * AI 이미지 품질 점수 계산
 * - 화질, 선명도, 노이즈, 구도, 실사/스톡 이미지 구분 등을 종합 평가
 * - 0~1 사이 점수 및 high/medium/low 레이블 반환
 */
export const getImageQualityScore = onRequest(
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
      const { imageUrl } = req.body;

      if (!imageUrl || typeof imageUrl !== "string") {
        res.json({
          score: 0.0,
          label: "low",
          reason: "이미지가 없습니다.",
        });
        return;
      }

      logger.info("📸 이미지 품질 평가 요청:", imageUrl.substring(0, 100));

      const prompt = `
너는 중고거래 플랫폼의 이미지 품질 감정 전문가야.

다음 이미지의 품질을 아래 기준으로 평가해줘:

### 평가 기준
1. 해상도/픽셀 품질: 이미지가 선명하고 고해상도인가?
2. 선명도/흔들림: 상품이 선명하게 찍혔는가? 흔들림이 없는가?
3. 노이즈/저조도: 노이즈가 없고 조도가 적절한가?
4. 구도: 상품의 구도가 잘 잡혀있는가?
5. 거리: 너무 멀거나 너무 가까운지 적절한가?
6. 실사/스톡 이미지: 실제 촬영 사진인가? 스톡 이미지나 홍보 이미지인가?
7. 상품 전체성: 상품 전체가 잘 나오고 특징이 보이는가?
8. 색감 왜곡: 색감이 왜곡되었거나 부자연스러운가?
9. 사기성 패턴: 스톡 이미지, 광고 이미지, 인터넷 이미지 패턴인가?

### 출력 형식
결과는 아래 JSON 형태만 출력:

{
  "score": 0.0~1.0,
  "label": "high | medium | low",
  "reason": "간단한 설명 (한국어)"
}

### 레이블 기준
- 0.0 ~ 0.4 → low (저품질): 흐림, 노이즈 많음, 스톡 이미지, 상품 식별 어려움
- 0.4 ~ 0.7 → medium (보통): 상품 식별 가능하나 품질 개선 여지 있음
- 0.7 ~ 1.0 → high (고품질): 선명하고 신뢰도 높은 실사 사진

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 이미지 품질 평가 전문가입니다. 이미지를 분석하여 품질 점수를 정확하게 평가합니다.",
            },
            {
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
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 300,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 이미지 품질 평가 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: { score: number; label: string; reason: string };
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const score = typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 1
            ? parsed.score
            : 0;

          let label = "low";
          if (score >= 0.7) {
            label = "high";
          } else if (score >= 0.4) {
            label = "medium";
          }

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : score >= 0.7
            ? "선명하고 신뢰도 높은 고품질 실사 사진입니다."
            : score >= 0.4
            ? "상품 식별 가능하나 품질 개선 여지가 있습니다."
            : "이미지 품질이 낮아 상품 식별이 어려울 수 있습니다.";

          result = { score, label, reason };
          logger.info("✅ 이미지 품질 평가 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 기본 점수
          result = {
            score: 0.5,
            label: "medium",
            reason: "이미지 품질 분석에 실패했습니다. 직접 확인해주세요.",
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 이미지 품질 평가 오류:", aiError);

        // Fallback: 기본 점수
        res.json({
          score: 0.5,
          label: "medium",
          reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 이미지 품질 평가 서버 오류:", e);
      res.status(500).json({
        score: 0,
        label: "low",
        reason: "서버 오류로 분석할 수 없습니다.",
      });
    }
  }
);

