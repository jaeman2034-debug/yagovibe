// functions/src/intentParser.ts
// 🔥 Phase 6: Edge Function - NLP Intent Parser
// ✅ API 키 보호, 프롬프트/스키마 통제, 타임아웃/레이트리밋

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

/**
 * Edge Function: NLP Intent Parser
 * 
 * 요청 스키마:
 * {
 *   "text": "농구 보여줘",
 *   "pathname": "/sports-hub"
 * }
 * 
 * 응답 스키마:
 * {
 *   "intent": "NAVIGATE",
 *   "payload": { "to": "/sports-hub?category=basketball" },
 *   "confidence": 0.86
 * }
 */
export const intentParser = onRequest(
  {
    timeoutSeconds: 5,
    memory: "256MiB",
    cors: true,
  },
  async (req, res) => {
    // 🔥 CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { text, pathname } = req.body;

      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Invalid request: text required" });
        return;
      }

      // 🔥 비용 가드: 짧은 문장만 (40자 제한)
      if (text.length > 40) {
        res.status(400).json({ error: "Text too long (40 char limit)" });
        return;
      }

      // 🔥 LLM 호출 (예: OpenAI, Gemini, Claude)
      const intent = await callLLM(text, pathname);

      res.status(200).json(intent);
    } catch (error: any) {
      logger.error("[intentParser] 오류:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * LLM 호출 (예시: OpenAI)
 * 
 * 🔥 프롬프트 (짧고 강제):
 * - 설명 금지
 * - JSON만 반환
 * - 불확실하면 UNKNOWN
 */
async function callLLM(text: string, pathname: string): Promise<{
  intent: string;
  payload: any;
  confidence: number;
}> {
  // 🔥 환경 변수에서 API 키 가져오기
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = `You are an intent classifier. Return ONLY valid JSON.

Allowed intents:
- NAVIGATE { to }
- SEARCH { query }
- SCROLL { direction: "up" | "down" }
- STOP {}
- UNKNOWN { raw }

Rules:
- Do not explain.
- If unsure, return UNKNOWN.
- Prefer concise payloads.

User text: "${text}"
Current path: "${pathname}"

Response (JSON only):`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 비용 효율적인 모델
        messages: [
          {
            role: "system",
            content: "You are a JSON-only intent classifier. Never explain, only return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // 낮은 temperature로 일관성 확보
        max_tokens: 100, // 짧은 응답만
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content from LLM");
    }

    // 🔥 JSON 파싱 (안전하게)
    const json = JSON.parse(content);

    // 🔥 스키마 검증
    if (!json.intent || !json.payload) {
      return {
        intent: "UNKNOWN",
        payload: { raw: text },
        confidence: 0.0,
      };
    }

    // 🔥 confidence 기본값
    const confidence = json.confidence ?? 0.5;

    return {
      intent: json.intent,
      payload: json.payload,
      confidence,
    };
  } catch (error: any) {
    logger.error("[callLLM] LLM 호출 실패:", error);
    // 🔥 실패 시 UNKNOWN 반환
    return {
      intent: "UNKNOWN",
      payload: { raw: text },
      confidence: 0.0,
    };
  }
}

