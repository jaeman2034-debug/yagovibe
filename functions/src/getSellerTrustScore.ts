import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getOpenAIClient } from "./lib/openaiClient";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

/**
 * AI 판매자 신뢰도 평가 시스템
 * - 판매자의 거래 이력, 응답 속도, 사기 위험도 등을 종합 분석
 * - 0~5점 사이의 신뢰도 점수와 등급 제공
 * - "매우 신뢰", "신뢰", "보통", "주의", "위험" 등급
 */
export const getSellerTrustScore = onRequest(
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
      const { seller, stats } = req.body;

      if (!seller || !seller.uid) {
        res.status(400).json({
          score: 0,
          label: "분석 실패",
          reason: "판매자 정보가 없습니다.",
        });
        return;
      }

      logger.info("⭐ AI 판매자 신뢰도 평가 요청:", { sellerId: seller.uid });

      // 통계 정보 정규화
      const normalizedStats = {
        totalSales: typeof stats?.totalSales === "number" ? stats.totalSales : 0,
        successfulSales: typeof stats?.successfulSales === "number" ? stats.successfulSales : 0,
        cancelledSales: typeof stats?.cancelledSales === "number" ? stats.cancelledSales : 0,
        reports: typeof stats?.reports === "number" ? stats.reports : 0,
        avgResponseMinutes: typeof stats?.avgResponseMinutes === "number" ? stats.avgResponseMinutes : null,
        avgFraudRisk: typeof stats?.avgFraudRisk === "number" ? Math.max(0, Math.min(1, stats.avgFraudRisk)) : 0.0,
        avgConditionScore: typeof stats?.avgConditionScore === "number" ? Math.max(0, Math.min(1, stats.avgConditionScore)) : 0.0,
        avgPriceFairness: typeof stats?.avgPriceFairness === "number" ? Math.max(0, Math.min(1, stats.avgPriceFairness)) : 0.0,
        accountAgeDays: typeof stats?.accountAgeDays === "number" ? stats.accountAgeDays : null,
      };

      // 판매자 정보 정리
      const sellerInfo = {
        uid: seller.uid || "",
        nickname: seller.nickname || "알 수 없음",
        createdAt: seller.createdAt || null,
      };

      // 계산된 지표
      const completionRate = normalizedStats.totalSales > 0
        ? normalizedStats.successfulSales / normalizedStats.totalSales
        : 0;
      const cancellationRate = normalizedStats.totalSales > 0
        ? normalizedStats.cancelledSales / normalizedStats.totalSales
        : 0;
      const reportRate = normalizedStats.totalSales > 0
        ? normalizedStats.reports / normalizedStats.totalSales
        : 0;

      const prompt = `
너는 중고거래 플랫폼의 "판매자 신뢰도 평가 AI"야.

아래 판매자 정보를 보고 0~5점 사이의 신뢰도 점수와 등급을 매겨줘.

### 판매자 기본 정보
${JSON.stringify(sellerInfo, null, 2)}

### 판매자 통계 정보
${JSON.stringify(normalizedStats, null, 2)}

### 계산된 지표
- 완료율: ${(completionRate * 100).toFixed(1)}% (${normalizedStats.successfulSales}/${normalizedStats.totalSales})
- 취소율: ${(cancellationRate * 100).toFixed(1)}% (${normalizedStats.cancelledSales}/${normalizedStats.totalSales})
- 신고율: ${(reportRate * 100).toFixed(1)}% (${normalizedStats.reports}/${normalizedStats.totalSales})
- 평균 응답 시간: ${normalizedStats.avgResponseMinutes !== null ? `${normalizedStats.avgResponseMinutes}분` : "정보 없음"}
- 계정 연령: ${normalizedStats.accountAgeDays !== null ? `${normalizedStats.accountAgeDays}일` : "정보 없음"}

### 평가 기준 (가이드)
**높은 점수 요소:**
- 거래 수 많음 (10회 이상 높음, 50회 이상 매우 높음)
- 완료율 높음 (80% 이상 좋음, 95% 이상 매우 좋음)
- 취소율 낮음 (10% 이하 좋음, 5% 이하 매우 좋음)
- 신고율 낮음 (5% 이하 좋음, 1% 이하 매우 좋음)
- 평균 응답 시간 빠름 (24시간 이내 좋음, 12시간 이내 매우 좋음)
- 사기 위험도 낮음 (avgFraudRisk < 0.3 좋음, < 0.1 매우 좋음)
- 가격 적정성 높음 (avgPriceFairness > 0.7 좋음, > 0.9 매우 좋음)
- 상태 점수 높음 (avgConditionScore > 0.7 좋음, > 0.9 매우 좋음)
- 계정 연령 오래됨 (365일 이상 좋음, 730일 이상 매우 좋음)

**낮은 점수 요소:**
- 신규 계정 (7일 이하 경고)
- 거래 이력 적음 (5회 이하 주의)
- 취소율 높음 (30% 이상 위험)
- 신고율 높음 (10% 이상 위험)
- 사기 위험도 높음 (avgFraudRisk > 0.7 위험, > 0.9 매우 위험)
- 가격 적정성 낮음 (avgPriceFairness < 0.3 의심)
- 응답 시간 느림 (72시간 이상 주의)

### 출력 형식 (JSON only)
{
  "score": 0~5 사이 숫자 (소수점 1자리),
  "label": "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험",
  "reason": "한 문장~두 문장으로 신뢰도 판단 이유 설명"
}

조건:
- score는 0.0~5.0 사이 숫자
- label은 반드시 "매우 신뢰", "신뢰", "보통", "주의", "위험" 중 하나
- reason은 간결하게 1~2문장으로 설명
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 AI 판매자 신뢰도 평가 시스템입니다. 판매자의 거래 이력, 응답 속도, 사기 위험도 등을 종합 분석하여 정확한 신뢰도 점수를 제공합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 500,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 판매자 신뢰도 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          score: number;
          label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험";
          reason: string;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 점수 검증 및 정규화
          let score = typeof parsed.score === "number" ? parsed.score : 0;
          score = Math.max(0, Math.min(5, score)); // 0~5 범위로 제한
          score = Math.round(score * 10) / 10; // 소수점 1자리

          // 라벨 검증
          const validLabels = ["매우 신뢰", "신뢰", "보통", "주의", "위험"];
          const label = validLabels.includes(parsed.label) ? parsed.label : "보통";

          // 이유 검증
          const reason = typeof parsed.reason === "string" ? parsed.reason : "AI 분석 중...";

          result = { score, label, reason };
          logger.info("✅ AI 판매자 신뢰도 평가 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 점수 계산
          let score = 3.0; // 기본값: 보통

          // 거래 수 기반 점수 (0~1점)
          if (normalizedStats.totalSales >= 50) score += 1.0;
          else if (normalizedStats.totalSales >= 10) score += 0.5;
          else if (normalizedStats.totalSales >= 5) score += 0.2;

          // 완료율 기반 점수 (0~1점)
          if (completionRate >= 0.95) score += 1.0;
          else if (completionRate >= 0.8) score += 0.5;
          else if (completionRate < 0.5) score -= 1.0;

          // 사기 위험도 기반 점수 조정 (-1~0점)
          if (normalizedStats.avgFraudRisk >= 0.7) score -= 1.5;
          else if (normalizedStats.avgFraudRisk >= 0.3) score -= 0.5;
          else if (normalizedStats.avgFraudRisk < 0.1) score += 0.5;

          // 취소율 기반 점수 조정 (-0.5~0점)
          if (cancellationRate >= 0.3) score -= 1.0;
          else if (cancellationRate >= 0.1) score -= 0.5;

          // 신고율 기반 점수 조정 (-1~0점)
          if (reportRate >= 0.1) score -= 1.0;
          else if (reportRate >= 0.05) score -= 0.5;

          score = Math.max(0, Math.min(5, score));
          score = Math.round(score * 10) / 10;

          let label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험" = "보통";
          if (score >= 4.5) label = "매우 신뢰";
          else if (score >= 3.5) label = "신뢰";
          else if (score >= 2.5) label = "보통";
          else if (score >= 1.5) label = "주의";
          else label = "위험";

          const reason = `거래 ${normalizedStats.totalSales}회, 완료율 ${(completionRate * 100).toFixed(1)}%, 사기 위험도 ${(normalizedStats.avgFraudRisk * 100).toFixed(1)}%`;

          result = { score, label, reason };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 판매자 신뢰도 평가 오류:", aiError);
        // Fallback: 기본 점수 계산
        const completionRate = normalizedStats.totalSales > 0
          ? normalizedStats.successfulSales / normalizedStats.totalSales
          : 0;
        let score = 3.0;
        if (normalizedStats.totalSales >= 50) score += 1.0;
        else if (normalizedStats.totalSales >= 10) score += 0.5;
        if (completionRate >= 0.95) score += 1.0;
        else if (completionRate >= 0.8) score += 0.5;
        if (normalizedStats.avgFraudRisk >= 0.7) score -= 1.5;
        else if (normalizedStats.avgFraudRisk >= 0.3) score -= 0.5;
        score = Math.max(0, Math.min(5, score));
        score = Math.round(score * 10) / 10;

        let label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험" = "보통";
        if (score >= 4.5) label = "매우 신뢰";
        else if (score >= 3.5) label = "신뢰";
        else if (score >= 2.5) label = "보통";
        else if (score >= 1.5) label = "주의";
        else label = "위험";

        res.json({
          score,
          label,
          reason: "AI 분석 실패로 기본 점수를 적용했습니다.",
        });
      }
    } catch (e: any) {
      logger.error("🔥 판매자 신뢰도 서버 오류:", e);
      res.status(500).json({
        score: 0,
        label: "분석 실패",
        reason: "서버 오류로 신뢰도를 평가할 수 없습니다.",
      });
    }
  }
);

