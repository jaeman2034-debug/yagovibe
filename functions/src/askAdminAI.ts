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
 * 운영자용 AI 도우미
 * - 운영자의 질문에 대해 Firestore 데이터를 기반으로 답변
 * - 사기 위험 상품, 판매자 통계, 검색 트렌드 등을 분석
 * - 핵심 포인트와 조치 사항을 제시
 */
export const askAdminAI = onRequest(
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
      const { question, fraudItems, sellerStats, searchTrends, dailyStats } = req.body;

      if (!question || typeof question !== "string" || !question.trim()) {
        res.status(400).json({
          answer: "질문을 입력해주세요.",
          important: [],
          action: [],
        });
        return;
      }

      logger.info("🧠 운영자 AI 도우미 요청:", { question: question.substring(0, 100) });

      // 데이터 정리 (너무 많은 데이터는 제한)
      const fraudItemsData = Array.isArray(fraudItems) ? fraudItems.slice(0, 50) : [];
      const sellerStatsData = Array.isArray(sellerStats) ? sellerStats.slice(0, 30) : [];
      const searchTrendsData = Array.isArray(searchTrends) ? searchTrends.slice(0, 20) : [];
      const dailyStatsData = dailyStats || {};

      const prompt = `
너는 중고거래 플랫폼 YAGO VIBE의 운영자용 AI 도우미야.

운영자의 질문에 대해 아래 데이터를 바탕으로 정확히 답변해줘.

### 운영자 질문
${question}

### 데이터 - 사기 위험 상품 (최근 ${fraudItemsData.length}개)
${JSON.stringify(fraudItemsData, null, 2)}

### 데이터 - 판매자 위험도 통계 (최근 ${sellerStatsData.length}개)
${JSON.stringify(sellerStatsData, null, 2)}

### 데이터 - 검색 트렌드 (최근 ${searchTrendsData.length}개)
${JSON.stringify(searchTrendsData, null, 2)}

### 데이터 - 일일 통계
${JSON.stringify(dailyStatsData, null, 2)}

### 작업
1) 운영자의 질문에 정확하게 답변
2) 핵심 포인트 2~5개 추출
3) 운영자가 취해야 할 조치 사항 1~3개 제시

### 출력 형식 (JSON only)
{
  "answer": "운영자에게 보여줄 답변 (2~5문장으로 간결하게)",
  "important": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3"],
  "action": ["운영자가 해야 할 조치1", "조치2"]
}

조건:
- answer는 한글로 2~5문장으로 간결하게 작성
- important는 2~5개의 핵심 포인트 배열
- action은 1~3개의 조치 사항 배열 (있는 경우만)
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼 YAGO VIBE의 운영자용 AI 도우미입니다. 운영자의 질문에 대해 플랫폼 데이터를 기반으로 정확하고 실용적인 답변을 제공합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1000,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 운영자 AI 도우미 결과:", aiText.substring(0, 300));

        // JSON 파싱
        let result: {
          answer: string;
          important: string[];
          action: string[];
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 검증 및 정규화
          result = {
            answer: typeof parsed.answer === "string" ? parsed.answer : "AI 분석 중...",
            important: Array.isArray(parsed.important)
              ? parsed.important.filter((item: any) => typeof item === "string").slice(0, 5)
              : [],
            action: Array.isArray(parsed.action)
              ? parsed.action.filter((item: any) => typeof item === "string").slice(0, 3)
              : [],
          };

          logger.info("✅ 운영자 AI 도우미 완료:", { answerLength: result.answer.length, importantCount: result.important.length });
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          result = {
            answer: "AI 응답을 파싱하는 중 오류가 발생했습니다. 다시 시도해주세요.",
            important: [],
            action: [],
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 운영자 도우미 오류:", aiError);
        res.json({
          answer: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          important: [],
          action: [],
        });
      }
    } catch (e: any) {
      logger.error("🔥 운영자 AI 도우미 서버 오류:", e);
      res.status(500).json({
        answer: "서버 오류가 발생했습니다.",
        important: [],
        action: [],
      });
    }
  }
);

