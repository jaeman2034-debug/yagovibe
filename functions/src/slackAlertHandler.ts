import fetch from "node-fetch";
import * as logger from "firebase-functions/logger";

/**
 * Slack Webhook으로 오류 알림 전송
 * @param message 알림 메시지
 * @param severity 심각도 레벨 (error, warning, info)
 */
export async function sendSlackAlert(
  message: string,
  severity: "error" | "warning" | "info" = "error"
): Promise<void> {
  const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn("⚠️ SLACK_ALERT_WEBHOOK_URL 또는 SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
    return;
  }

  try {
    const emoji = severity === "error" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
    const color = severity === "error" ? "#FF0000" : severity === "warning" ? "#FFA500" : "#36A2EB";

    const payload = {
      text: `${emoji} YAGO SPORTS 워크플로우 알림`,
      attachments: [
        {
          color: color,
          text: message,
          footer: "YAGO SPORTS AI 시스템",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack 알림 전송 실패: ${response.statusText}`);
    }

    logger.info(`✅ Slack 알림 전송 완료: ${severity} - ${message.slice(0, 50)}...`);
  } catch (error: any) {
    logger.error("❌ Slack 알림 전송 오류:", error);
    // Slack 알림 실패해도 앱은 계속 작동하도록 에러를 무시하지 않음
  }
}

