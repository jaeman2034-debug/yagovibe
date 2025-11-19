import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 31: 베타 피드백 수집 API
 * 외부/웹에서 직접 피드백을 전송할 수 있는 HTTP 엔드포인트
 */
export const feedbackApi = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      // CORS 헤더 설정
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

      const { email, rating, what, issue, idea, user } = req.body || {};

      // 필수 필드 검증
      if (!what && !issue && !idea) {
        res.status(400).json({
          ok: false,
          error: "what, issue, 또는 idea 중 하나는 필수입니다.",
        });
        return;
      }

      // 피드백 저장
      await db.collection("betaFeedback").add({
        email: email || "web",
        user: user || email || "anonymous",
        rating: rating ? Number(rating) : null,
        what: what || null,
        issue: issue || null,
        idea: idea || null,
        createdAt: FieldValue.serverTimestamp(),
        timestamp: Date.now(),
        source: "web",
      });

      logger.info("✅ 베타 피드백 저장 완료", { email: email || "anonymous", rating });

      res.status(200).json({
        ok: true,
        message: "피드백이 성공적으로 전송되었습니다.",
      });
    } catch (error: any) {
      logger.error("❌ 피드백 수집 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "알 수 없는 오류",
      });
    }
  }
);

