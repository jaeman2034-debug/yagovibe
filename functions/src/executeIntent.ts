/**
 * 🚀 Execute Intent HTTP Endpoint
 * 프로덕션 구조로 리팩토링
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { executeAgentAction } from "./executor/executeAgentAction";

export const executeIntent = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
    secrets: ["OPENAI_API_KEY", "GMAPS_API_KEY"],
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
      const { intent, text } = req.body;

      if (!intent || !text) {
        res.status(400).json({ error: "intent and text required" });
        return;
      }

      logger.info("🚀 Execute Intent 요청:", intent.type, intent.autoNavigate);

      // MAP_SEARCH가 아니면 바로 종료
      if (intent.type !== "MAP_SEARCH") {
        res.json({
          action: "NONE",
          message: "MAP_SEARCH가 아닌 Intent",
        });
        return;
      }

      // Execute Agent Action (새 구조)
      const result = await executeAgentAction({
        action: "SEARCH",
        query: intent.query,
        filters: intent.filters || {
          openNow: false,
          parking: false,
          sort: "DEFAULT",
        },
        userText: text,
        autoNavigate: intent.autoNavigate ?? false,
      });

      res.json(result);
      return;
    } catch (error: any) {
      logger.error("❌ Execute Intent 오류:", error);
      res.status(500).json({
        error: "Execute Intent failed",
        message: error.message,
      });
    }
  }
);
