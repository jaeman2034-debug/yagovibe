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
 * AI 사기 감지 (Anti-Fraud Detector)
 * - 가격 이상치, 설명 부실도, 이미지 신뢰도, 카테고리 위험성 등을 종합 분석
 * - 위험도 점수(0~1) 및 경고 메시지 생성
 */
export const detectFraudRisk = onRequest(
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
        price,
        avgPrice,
        description,
        category,
        tags,
        imageUrl,
        userProfile = {},
      } = req.body;

      if (!name) {
        res.json({
          risk: 0,
          label: "low",
          reason: "상품 정보가 부족하여 분석할 수 없습니다.",
        });
        return;
      }

      logger.info("⚠️ 사기 감지 요청:", { name, price, category });

      const prompt = `
너는 중고 거래 플랫폼의 '사기 탐지 AI'야.

아래 상품 정보가 사기일 확률을 0~1 사이의 점수로 계산해줘.
그리고 사람이 이해할 수 있는 이유(reason)를 작성해줘.

### 상품 정보
- 상품명: ${name || ""}
- 카테고리: ${category || ""}
- 가격: ${price || "없음"}
- 지역 평균 가격: ${avgPrice || "없음"}
- 설명: ${description || ""}
- 태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}
- 이미지 URL: ${imageUrl ? "있음" : "없음"}

### 판매자 정보
- UID: ${userProfile.uid || "없음"}
- 계정 생성일: ${userProfile.createdAt || "없음"}
- 총 판매 수: ${userProfile.totalSales || "0"}

### 분석 기준
1) 가격 이상치: 평균가 대비 너무 낮거나 높은 경우 (30% 이상 차이)
2) 설명 부실도: 단어 수가 10자 미만이거나 원본 복붙 의심
3) 이미지 신뢰도: 이미지가 없거나 스톡 이미지/광고 이미지 사용 의심
4) 카테고리 위험성: 전자기기·고가품(노트북, 스마트폰, 명품 등)은 사기 빈도 높음
5) 태그/키워드 위험 신호: "급처", "미개봉 싸게", "정품확인 X", "선착순" 등
6) 판매자 정보 부족: 익명 유저 또는 최근 가입(7일 이내)
7) 상품명 이상: 과도한 특수문자, 반복 문자, 대문자 남용

출력 형식(JSON만):
{
  "risk": 0.0~1.0,
  "label": "low | medium | high",
  "reason": "사유 설명 (한국어로 간단히)"
}

점수 기준:
- 0.0 ~ 0.3: low (안전) - "이 상품은 일반적으로 안전해 보입니다."
- 0.3 ~ 0.6: medium (주의) - "가격이나 설명을 다시 확인해보세요."
- 0.6 ~ 1.0: high (고위험) - "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요."

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고 거래 플랫폼의 사기 탐지 전문가입니다. 상품 정보를 분석하여 사기 위험도를 정확하게 평가합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 300,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 사기 감지 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: { risk: number; label: string; reason: string };
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          const risk = typeof parsed.risk === "number" && parsed.risk >= 0 && parsed.risk <= 1
            ? parsed.risk
            : 0;

          let label = "low";
          if (risk >= 0.6) {
            label = "high";
          } else if (risk >= 0.3) {
            label = "medium";
          }

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : risk >= 0.6
            ? "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요."
            : risk >= 0.3
            ? "가격이나 설명을 다시 확인해보세요."
            : "이 상품은 일반적으로 안전해 보입니다.";

          result = { risk, label, reason };
          logger.info("✅ 사기 감지 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 간단한 위험도 계산
          let risk = 0;
          let reason = "이 상품은 일반적으로 안전해 보입니다.";

          // 가격 이상치 체크
          if (price && avgPrice) {
            const priceDiff = Math.abs(price - avgPrice) / avgPrice;
            if (priceDiff > 0.5) {
              risk += 0.3;
              reason = "가격이 평균가 대비 크게 다릅니다. 주의가 필요합니다.";
            }
          }

          // 설명 부실도 체크
          if (!description || description.trim().length < 10) {
            risk += 0.2;
            reason = "설명이 부실하여 위험도가 있습니다.";
          }

          // 카테고리 위험성 체크
          const highRiskCategories = ["노트북", "스마트폰", "태블릿", "명품", "시계", "가방"];
          if (category && highRiskCategories.some((c) => category.includes(c))) {
            risk += 0.2;
          }

          let label = "low";
          if (risk >= 0.6) {
            label = "high";
            reason = "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요.";
          } else if (risk >= 0.3) {
            label = "medium";
            reason = "가격이나 설명을 다시 확인해보세요.";
          }

          result = { risk: Math.min(risk, 1.0), label, reason };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 사기 감지 오류:", aiError);

        // Fallback: 기본 위험도
        res.json({
          risk: 0,
          label: "low",
          reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 사기 감지 서버 오류:", e);
      res.status(500).json({
        risk: 0,
        label: "low",
        reason: "서버 오류로 분석할 수 없습니다.",
      });
    }
  }
);

