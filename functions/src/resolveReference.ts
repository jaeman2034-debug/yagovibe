/**
 * 🧠 Resolve Reference (지시어 해석)
 * "아까", "방금", "그거", "다시", "말고" 같은 표현을 이전 Intent와 연결
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: any = null;
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

export const resolveReference = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
    secrets: ["OPENAI_API_KEY"],
  } as any,
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
      const { userText, memorySummary, memoryCount } = req.body;

      if (!userText || typeof userText !== "string") {
        res.status(400).json({ error: "userText required" });
        return;
      }

      // 메모리가 없으면 NONE 반환
      if (!memorySummary || !memoryCount || memoryCount === 0) {
        res.json({ resolution: "NONE" });
        return;
      }

      logger.info("🧠 지시어 해석 요청:", userText);

      const openai = await getOpenAIClient();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "너는 지시어 해석기다. " +
              "사용자가 '아까', '방금', '그거', '그 데', '다시', '말고' 같은 표현을 쓰면 " +
              "이전 결과를 참조하는 것으로 판단한다. " +
              "\n\n" +
              "결과 규칙: " +
              "- '아까/방금/그거/그 데 + 다시' 또는 '다시 안내' → USE_LAST " +
              "- '방금 찾은 데 말고' 또는 '다른 데' → USE_LAST_EXCEPT " +
              "- 지시어 없으면 → NONE " +
              "\n\n" +
              "설명하지 말고 결과만 반환: USE_LAST 또는 USE_LAST_EXCEPT 또는 NONE",
          },
          {
            role: "user",
            content:
              "문장:\n" +
              userText +
              "\n\n최근 기록:\n" +
              memorySummary +
              "\n\n지시어가 있으면 USE_LAST 또는 USE_LAST_EXCEPT, 없으면 NONE:",
          },
        ],
        temperature: 0, // 결정론적 응답
      });

      const responseText =
        completion.choices[0]?.message?.content?.trim().toUpperCase() || "NONE";

      // 유효한 값인지 확인
      let resolution: "USE_LAST" | "USE_LAST_EXCEPT" | "NONE" = "NONE";
      if (responseText.includes("USE_LAST_EXCEPT")) {
        resolution = "USE_LAST_EXCEPT";
      } else if (responseText.includes("USE_LAST")) {
        resolution = "USE_LAST";
      }

      logger.info("✅ 지시어 해석 결과:", resolution);

      res.json({ resolution });
      return;
    } catch (error: any) {
      logger.error("❌ 지시어 해석 오류:", error);
      res.status(500).json({
        error: "Resolve Reference failed",
        message: error.message,
        resolution: "NONE", // 실패 시 NONE 반환
      });
    }
  }
);
