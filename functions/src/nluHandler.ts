import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const nluHandler = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리 (preflight)
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { text } = (req.body || {}) as { text?: string };
    logger.info("🎤 NLU 음성 명령 수신:", text);

    if (typeof text === "string" && text.includes("지도")) {
      res.json({ action: "navigate", target: "/voice-map", intent: "open_map" });
      return;
    }

    res.json({ action: "none", intent: "unknown" });
  }
);
