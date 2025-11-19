import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 25: 수동 트리거 HTTP 함수들
 * Firestore 트리거 함수들을 수동으로 실행할 수 있도록 HTTP 함수로 래핑
 */

/**
 * 수동으로 인사이트 음성 변환 트리거
 * insights/weekly 문서를 업데이트하여 generateInsightAudio 트리거
 */
export const triggerInsightAudio = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 120,
  },
  async (req, res) => {
    try {
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

      logger.info("🎧 인사이트 음성 변환 수동 트리거");

      // insights/weekly 문서 업데이트하여 트리거
      const insightRef = db.collection("insights").doc("weekly");
      const insightDoc = await insightRef.get();

      if (!insightDoc.exists) {
        res.status(404).json({ ok: false, error: "insights/weekly 문서가 없습니다." });
        return;
      }

      const data = insightDoc.data();
      if (!data?.content) {
        res.status(400).json({ ok: false, error: "content가 없습니다." });
        return;
      }

      // 업데이트하여 트리거 (ttsTriggeredAt 필드 업데이트)
      await insightRef.update({
        ttsTriggeredAt: FieldValue.serverTimestamp(),
        manualTrigger: true,
      });

      logger.info("✅ insights/weekly 문서 업데이트 완료, generateInsightAudio 트리거됨");

      res.json({
        ok: true,
        message: "인사이트 음성 변환 트리거 완료",
      });
    } catch (error: any) {
      logger.error("❌ 인사이트 음성 변환 트리거 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

/**
 * 수동으로 인사이트 PDF 생성 트리거
 * insights/weekly 문서를 업데이트하여 generateInsightPDF 트리거
 */
export const triggerInsightPDF = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 180,
  },
  async (req, res) => {
    try {
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

      logger.info("📄 인사이트 PDF 생성 수동 트리거");

      // insights/weekly 문서 업데이트하여 트리거
      const insightRef = db.collection("insights").doc("weekly");
      const insightDoc = await insightRef.get();

      if (!insightDoc.exists) {
        res.status(404).json({ ok: false, error: "insights/weekly 문서가 없습니다." });
        return;
      }

      const data = insightDoc.data();
      if (!data?.content) {
        res.status(400).json({ ok: false, error: "content가 없습니다." });
        return;
      }

      // 업데이트하여 트리거 (pdfTriggeredAt 필드 업데이트)
      await insightRef.update({
        pdfTriggeredAt: FieldValue.serverTimestamp(),
        manualTrigger: true,
      });

      logger.info("✅ insights/weekly 문서 업데이트 완료, generateInsightPDF 트리거됨");

      res.json({
        ok: true,
        message: "인사이트 PDF 생성 트리거 완료",
      });
    } catch (error: any) {
      logger.error("❌ 인사이트 PDF 생성 트리거 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

/**
 * 수동으로 인사이트 배포 트리거
 * insights/weekly 문서의 pdfUrl을 업데이트하여 distributeInsight 트리거
 */
export const triggerDistributeInsight = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 300,
  },
  async (req, res) => {
    try {
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

      logger.info("🚀 인사이트 배포 수동 트리거");

      // insights/weekly 문서 업데이트하여 트리거
      const insightRef = db.collection("insights").doc("weekly");
      const insightDoc = await insightRef.get();

      if (!insightDoc.exists) {
        res.status(404).json({ ok: false, error: "insights/weekly 문서가 없습니다." });
        return;
      }

      const data = insightDoc.data();
      if (!data?.pdfUrl) {
        res.status(400).json({ ok: false, error: "pdfUrl이 없습니다. 먼저 PDF를 생성하세요." });
        return;
      }

      // 업데이트하여 트리거 (distributeTriggeredAt 필드 업데이트)
      // distributed 플래그를 false로 설정하여 재배포 가능하게 함
      await insightRef.update({
        distributed: false,
        distributeTriggeredAt: FieldValue.serverTimestamp(),
        manualTrigger: true,
      });

      logger.info("✅ insights/weekly 문서 업데이트 완료, distributeInsight 트리거됨");

      res.json({
        ok: true,
        message: "인사이트 배포 트리거 완료",
      });
    } catch (error: any) {
      logger.error("❌ 인사이트 배포 트리거 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

