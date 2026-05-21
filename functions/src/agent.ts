/**
 * 🧠 Voice Agent HTTP Endpoint
 * 프로덕션 구조로 리팩토링
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { runAgent } from "./agent/runAgent";
import { createUltimateFallbackResponse } from "./recovery/fallback";

export const agent = onRequest(
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

      const trimmedText = String(userText || "").trim();
      if (!trimmedText) {
        res.status(400).json({ error: "userText cannot be empty" });
        return;
      }

      logger.info("🧠 Agent 요청 수신:", trimmedText);

      // Agent 실행 (새 구조)
      const agentResult = await runAgent({
        userText: trimmedText,
        memorySummary: memorySummary || "",
        memoryCount: memoryCount || 0,
      });

      logger.info("✅ Agent 결정:", agentResult.action, agentResult.query);

      res.json(agentResult);
    } catch (error: any) {
      logger.error("❌ Agent 오류:", error);
      const fallback = createUltimateFallbackResponse(
        req.body?.userText || ""
      );
      res.status(500).json({
        error: "Agent failed",
        message: error.message,
        // 🛡️ Fallback: 기본 SEARCH 액션 반환
        fallback,
      });
    }
  }
);
