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
 * AI 종합 등급 생성 시스템
 * - 모든 AI 분석 결과를 종합하여 0~5점의 종합 등급 생성
 * - 상태, 이미지 품질, 사기 위험, 구성품, 가격 등을 모두 고려
 */
export const generateTotalScore = onRequest(
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
        conditionScore,
        imageQualityScore,
        fraud,
        components,
        price,
        historicalPrices,
        oneLineSummary,
      } = req.body;

      logger.info("⭐ AI 종합 등급 생성 요청");

      // 구성품 완전성 계산
      const componentsInfo = Array.isArray(components) && components.length > 0
        ? {
            total: components.length,
            available: components.filter((c: any) => c.status === "있음").length,
            completeness: components.filter((c: any) => c.status === "있음").length / components.length,
          }
        : { total: 0, available: 0, completeness: 0.5 }; // 정보 없으면 중간값

      // 가격 적정성 계산
      const priceInfo = Array.isArray(historicalPrices) && historicalPrices.length > 0 && price
        ? {
            current: Number(price) || 0,
            avg: historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length,
            min: Math.min(...historicalPrices),
            max: Math.max(...historicalPrices),
            isReasonable: (() => {
              const current = Number(price) || 0;
              const avg = historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length;
              const diff = Math.abs(current - avg) / avg;
              return diff < 0.3; // 평균 대비 30% 이내면 적정
            })(),
          }
        : { current: 0, avg: 0, min: 0, max: 0, isReasonable: true }; // 정보 없으면 적정으로 간주

      const prompt = `
너는 중고거래 플랫폼의 "AI 종합 등급 평가 전문가"야.

아래 정보를 종합하여 상품에 대한 총점(0~5)을 매기고 그 이유를 간단하게 요약해줘.

### 입력 데이터
상태 점수(0~1): ${conditionScore || 0.5}
이미지 품질(0~1): ${imageQualityScore || 0.5}
사기 위험 점수: ${fraud?.risk || 0}
사기 레벨: ${fraud?.label || "low"}
구성품 정보: 총 ${componentsInfo.total}개 중 ${componentsInfo.available}개 있음 (완전도: ${Math.round(componentsInfo.completeness * 100)}%)
현재 가격: ${priceInfo.current > 0 ? priceInfo.current.toLocaleString() + "원" : "정보 없음"}
최근 시세: ${priceInfo.avg > 0 ? `평균 ${Math.round(priceInfo.avg).toLocaleString()}원` : "정보 없음"} ${priceInfo.isReasonable ? "(적정)" : "(비적정)"}
한줄 요약: ${oneLineSummary || "없음"}

### 점수 계산 기준
- 상태 점수 비중: 30% (0~1 점수를 0~1.5점으로 변환)
- 이미지 품질 비중: 20% (0~1 점수를 0~1.0점으로 변환)
- 사기 위험 비중: 20% (risk가 낮을수록 높은 점수, 0~1점)
- 구성품 충실도: 15% (완전도에 따라 0~0.75점)
- 가격 적정성: 10% (적정하면 0.5점, 비적정하면 감점)
- 설명/요약 신뢰도: 5% (한줄 요약이 있으면 0.25점)

### 등급 기준
- 4.5 ~ 5.0: 매우 좋음 (거의 완벽한 상품)
- 3.5 ~ 4.5: 좋음 (양호한 상품)
- 2.5 ~ 3.5: 보통 (일반적인 상품)
- 1.5 ~ 2.5: 나쁨 (주의 필요)
- 0.0 ~ 1.5: 매우 나쁨 (사기 위험 높음)

### 출력 형식(JSON only):
{
  "score": 0~5 (소수점 1자리),
  "label": "매우 좋음 | 좋음 | 보통 | 나쁨 | 매우 나쁨",
  "reason": "요약 사유 (1~2문장)"
}

조건:
- score는 0.0~5.0 사이의 숫자 (소수점 1자리)
- label은 위 5가지 중 하나
- reason은 간결하게 1~2문장으로 작성
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 종합 등급 평가 전문가입니다. 모든 분석 결과를 종합하여 정확한 등급을 매깁니다.",
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
        logger.info("🤖 AI 종합 등급 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          score: number;
          label: string;
          reason: string;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 점수 검증 및 정규화
          let score = typeof parsed.score === "number" ? parsed.score : 0;
          score = Math.max(0, Math.min(5, score)); // 0~5 범위로 제한
          score = Math.round(score * 10) / 10; // 소수점 1자리

          // 레이블 검증
          const validLabels = ["매우 좋음", "좋음", "보통", "나쁨", "매우 나쁨"];
          let label = typeof parsed.label === "string" && validLabels.includes(parsed.label)
            ? parsed.label
            : score >= 4.5
            ? "매우 좋음"
            : score >= 3.5
            ? "좋음"
            : score >= 2.5
            ? "보통"
            : score >= 1.5
            ? "나쁨"
            : "매우 나쁨";

          const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason.trim()
            : `${label} 등급의 상품입니다.`;

          result = { score, label, reason };
          logger.info("✅ AI 종합 등급 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 점수 계산
          const baseScore = 
            (conditionScore || 0.5) * 1.5 + // 30%
            (imageQualityScore || 0.5) * 1.0 + // 20%
            (1 - (fraud?.risk || 0.5)) * 1.0 + // 20% (risk가 낮을수록 높은 점수)
            componentsInfo.completeness * 0.75 + // 15%
            (priceInfo.isReasonable ? 0.5 : 0.2) + // 10%
            (oneLineSummary ? 0.25 : 0); // 5%

          const finalScore = Math.min(5, Math.max(0, baseScore));
          result = {
            score: Math.round(finalScore * 10) / 10,
            label: finalScore >= 4.5 ? "매우 좋음" : finalScore >= 3.5 ? "좋음" : finalScore >= 2.5 ? "보통" : finalScore >= 1.5 ? "나쁨" : "매우 나쁨",
            reason: "AI 분석을 종합하여 등급을 매겼습니다.",
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 종합 등급 오류:", aiError);
        // Fallback: 기본 점수 계산
        const baseScore = 
          (conditionScore || 0.5) * 1.5 +
          (imageQualityScore || 0.5) * 1.0 +
          (1 - (fraud?.risk || 0.5)) * 1.0 +
          componentsInfo.completeness * 0.75 +
          (priceInfo.isReasonable ? 0.5 : 0.2) +
          (oneLineSummary ? 0.25 : 0);

        const finalScore = Math.min(5, Math.max(0, baseScore));
        res.json({
          score: Math.round(finalScore * 10) / 10,
          label: finalScore >= 4.5 ? "매우 좋음" : finalScore >= 3.5 ? "좋음" : finalScore >= 2.5 ? "보통" : finalScore >= 1.5 ? "나쁨" : "매우 나쁨",
          reason: "AI 분석을 종합하여 등급을 매겼습니다.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 종합 등급 서버 오류:", e);
      res.status(500).json({
        score: 0,
        label: "분석 실패",
        reason: "서버 오류로 등급을 매길 수 없습니다.",
      });
    }
  }
);

