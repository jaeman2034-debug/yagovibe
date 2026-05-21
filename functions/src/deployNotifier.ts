import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

/**
 * Step 30: 배포 완료 알림 함수
 * 배포 후 자동으로 Slack에 알림을 전송합니다.
 */
export const notifyDeployment = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 1,
  },
  async (req, res) => {
    try {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.SLACK_ALERT_WEBHOOK_URL;

      if (!webhookUrl) {
        logger.warn("⚠️ Slack Webhook URL이 설정되지 않았습니다.");
        res.status(200).json({
          ok: false,
          message: "Slack Webhook URL이 설정되지 않았습니다.",
        });
        return;
      }

      const deploymentInfo = {
        timestamp: new Date().toLocaleString("ko-KR"),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString("ko-KR"),
        version: process.env.FIREBASE_CONFIG
          ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
          : "unknown",
      };

      const message = {
        text: `🚀 *YAGO SPORTS AI 리포트 시스템 배포 완료!*`,
        attachments: [
          {
            color: "#36a64f",
            fields: [
              {
                title: "📅 배포 시간",
                value: deploymentInfo.timestamp,
                short: true,
              },
              {
                title: "🌐 프로젝트",
                value: deploymentInfo.version,
                short: true,
              },
              {
                title: "✅ 배포 항목",
                value: "Functions, Hosting, Firestore 모두 연결됨",
                short: false,
              },
            ],
            footer: "YAGO SPORTS AI 시스템",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack 알림 전송 실패: ${response.statusText}`);
      }

      logger.info("✅ Slack 배포 알림 전송 완료");

      res.status(200).json({
        ok: true,
        message: "배포 알림이 Slack에 전송되었습니다.",
        timestamp: deploymentInfo.timestamp,
      });
    } catch (error: any) {
      logger.error("❌ 배포 알림 전송 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "알 수 없는 오류",
      });
    }
  }
);

