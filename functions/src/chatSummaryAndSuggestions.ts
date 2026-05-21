/**
 * 🔥 채팅 요약 & 추천 답변 생성 (옵션형, 실사용 각)
 * 
 * - 대화 요약: 최근 30개 메시지를 2줄로 요약
 * - 추천 답변: 자연스러운 답변 3개 제안
 * 
 * 사용 예시:
 * POST /chatSummaryAndSuggestions
 * Body: { messages: [...], type: "summary" | "suggestions" }
 */

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
 * 채팅 요약 & 추천 답변 생성 함수
 */
export const chatSummaryAndSuggestions = onRequest(
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
      const { messages, type, currentUserId } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          summary: "",
          suggestions: [],
        });
        return;
      }

      if (!type || (type !== "summary" && type !== "suggestions")) {
        res.status(400).json({ error: "type must be 'summary' or 'suggestions'" });
        return;
      }

      // 최근 30개 메시지만 사용 (비용 최적화)
      const recentMessages = messages.slice(-30).filter((m: any) => m.text && m.text.trim());

      if (recentMessages.length === 0) {
        res.json({
          summary: "",
          suggestions: [],
        });
        return;
      }

      // 대화 컨텍스트 생성
      const context = recentMessages
        .map((m: any) => {
          const sender = m.uid === currentUserId || m.senderId === currentUserId ? "나" : "상대";
          return `${sender}: ${m.text}`;
        })
        .join("\n");

      if (type === "summary") {
        // 🔥 대화 요약 생성
        const summaryPrompt = `
다음은 채팅 대화 내용이다.

핵심만 2줄로 요약해줘.

대화 내용:
${context}

출력 형식(JSON만):
{
  "summary": "요약 내용"
}

조건:
- 2줄 이내로 간단하게
- 핵심 내용만 포함
- 한국어로 자연스럽게
`;

        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 채팅 대화를 간결하게 요약하는 전문가입니다. 핵심만 2줄로 요약합니다.",
            },
            {
              role: "user",
              content: summaryPrompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 200,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        let summary = "";

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
          summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
        } catch (parseError) {
          logger.error("❌ JSON 파싱 오류:", parseError);
        }

        res.json({ summary, suggestions: [] });
      } else {
        // 🔥 추천 답변 생성
        const suggestionsPrompt = `
다음 대화에 이어서 자연스러운 답변 3개를 제안해줘.

대화 내용:
${context}

출력 형식(JSON만):
{
  "suggestions": ["답변1", "답변2", "답변3"]
}

조건:
- 각 답변은 짧고 간결하게 (한 문장 이내)
- 자연스럽고 예의 바른 표현
- 대화 맥락에 맞는 내용
- 한국어로 작성
- 3개 모두 다르게
`;

        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 채팅 대화를 분석하여 자연스러운 답변을 제안하는 전문가입니다. 대화 맥락에 맞는 짧고 예의 바른 답변 3개를 제안합니다.",
            },
            {
              role: "user",
              content: suggestionsPrompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 200,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        let suggestions: string[] = [];

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
          if (Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions
              .filter((s: any) => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
              .slice(0, 3); // 최대 3개만
          }
        } catch (parseError) {
          logger.error("❌ JSON 파싱 오류:", parseError);
        }

        res.json({ summary: "", suggestions });
      }
    } catch (error: any) {
      logger.error("❌ 채팅 요약/추천 답변 생성 오류:", error);
      // 실패 시 조용히 빈 결과 반환 (사용자 경험 유지)
      res.json({
        summary: "",
        suggestions: [],
      });
    }
  }
);

