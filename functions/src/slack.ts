import fetch from "node-fetch";
import * as logger from "firebase-functions/logger";

/**
 * Slack 알림 전송 유틸 함수
 * 환경 변수에서 Slack Webhook URL을 찾아서 메시지 전송
 */
export async function sendSlack(payload: any) {
  // 여러 소스에서 Slack Webhook URL 찾기
  const url = process.env.SLACK_WEBHOOK_URL || (process as any).env.slack_webhook_url;
  
  const cfgUrl = process.env.SLACK_WEBHOOK_URL || "";
  
  const functionsCfgUrl = (process as any).env.FIREBASE_CONFIG
    ? JSON.parse((process as any).env.FIREBASE_CONFIG).slack?.webhook_url
    : undefined;

  const webhook =
    process.env.SLACK_WEBHOOK_URL ||
    functionsCfgUrl ||
    (process as any).env.slack_webhook_url;

  const target = webhook || url;
  
  if (!target) {
    logger.warn("⚠️ Slack webhook URL이 설정되지 않았습니다.");
    throw new Error("Missing Slack webhook url");
  }

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      logger.error(`❌ Slack 전송 실패: ${res.status} ${txt}`);
      throw new Error(`Slack send failed: ${res.status} ${txt}`);
    }

    logger.info("✅ Slack 알림 전송 완료");
  } catch (error: any) {
    logger.error("❌ Slack 알림 전송 오류:", error);
    throw error;
  }
}

