/**
 * 🔔 QR 로그인 알림 전송 유틸리티
 * 
 * Slack/Discord Webhook 또는 이메일을 통한 알림 전송
 */

import * as logger from "firebase-functions/logger";
import axios from "axios";

export interface QRLoginAlert {
  type: "success_rate" | "sms_failure_rate" | "avg_login_time" | "expiration_surge" | "error_surge";
  severity: "warning" | "critical";
  message: string;
  stats: {
    current: number;
    threshold: number;
    period: string; // "last_hour" | "last_24h" | "last_7d"
  };
  details?: Record<string, any>;
}

/**
 * Slack Webhook으로 알림 전송
 */
export async function sendSlackAlert(alert: QRLoginAlert, webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    logger.warn("⚠️ [notifyQRLoginAlerts] Slack Webhook URL이 설정되지 않음");
    return false;
  }

  const emoji = alert.severity === "critical" ? "🚨" : "⚠️";
  const color = alert.severity === "critical" ? "#ff0000" : "#ffaa00";

  const payload = {
    text: `${emoji} QR 로그인 알림`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} QR 로그인 알림`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*유형:*\n${getAlertTypeLabel(alert.type)}`,
          },
          {
            type: "mrkdwn",
            text: `*심각도:*\n${alert.severity === "critical" ? "🔴 Critical" : "🟡 Warning"}`,
          },
          {
            type: "mrkdwn",
            text: `*현재 값:*\n${formatValue(alert.type, alert.stats.current)}`,
          },
          {
            type: "mrkdwn",
            text: `*임계치:*\n${formatValue(alert.type, alert.stats.threshold)}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*메시지:*\n${alert.message}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `기간: ${getPeriodLabel(alert.stats.period)}`,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });
    logger.info("✅ [notifyQRLoginAlerts] Slack 알림 전송 성공:", alert.type);
    return true;
  } catch (error: any) {
    logger.error("❌ [notifyQRLoginAlerts] Slack 알림 전송 실패:", {
      error: error.message,
      alertType: alert.type,
    });
    return false;
  }
}

/**
 * Discord Webhook으로 알림 전송
 */
export async function sendDiscordAlert(alert: QRLoginAlert, webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    logger.warn("⚠️ [notifyQRLoginAlerts] Discord Webhook URL이 설정되지 않음");
    return false;
  }

  const emoji = alert.severity === "critical" ? "🚨" : "⚠️";
  const color = alert.severity === "critical" ? 0xff0000 : 0xffaa00;

  const embed = {
    title: `${emoji} QR 로그인 알림`,
    description: alert.message,
    color,
    fields: [
      {
        name: "유형",
        value: getAlertTypeLabel(alert.type),
        inline: true,
      },
      {
        name: "심각도",
        value: alert.severity === "critical" ? "🔴 Critical" : "🟡 Warning",
        inline: true,
      },
      {
        name: "현재 값",
        value: formatValue(alert.type, alert.stats.current),
        inline: true,
      },
      {
        name: "임계치",
        value: formatValue(alert.type, alert.stats.threshold),
        inline: true,
      },
      {
        name: "기간",
        value: getPeriodLabel(alert.stats.period),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(url, { embeds: [embed] }, {
      headers: { "Content-Type": "application/json" },
    });
    logger.info("✅ [notifyQRLoginAlerts] Discord 알림 전송 성공:", alert.type);
    return true;
  } catch (error: any) {
    logger.error("❌ [notifyQRLoginAlerts] Discord 알림 전송 실패:", {
      error: error.message,
      alertType: alert.type,
    });
    return false;
  }
}

/**
 * 알림 전송 (자동으로 설정된 채널로 전송)
 */
export async function sendAlert(alert: QRLoginAlert): Promise<boolean> {
  const results = await Promise.allSettled([
    sendSlackAlert(alert),
    sendDiscordAlert(alert),
  ]);

  const successCount = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return successCount > 0;
}

/**
 * 알림 유형 라벨
 */
function getAlertTypeLabel(type: QRLoginAlert["type"]): string {
  const labels: Record<QRLoginAlert["type"], string> = {
    success_rate: "성공률 저하",
    sms_failure_rate: "SMS 실패율 증가",
    avg_login_time: "평균 로그인 시간 증가",
    expiration_surge: "세션 만료 급증",
    error_surge: "에러 급증",
  };
  return labels[type] || type;
}

/**
 * 값 포맷팅
 */
function formatValue(type: QRLoginAlert["type"], value: number): string {
  switch (type) {
    case "success_rate":
    case "sms_failure_rate":
      return `${value.toFixed(1)}%`;
    case "avg_login_time":
      return `${Math.round(value)}초`;
    default:
      return value.toString();
  }
}

/**
 * 기간 라벨
 */
function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    last_hour: "최근 1시간",
    last_24h: "최근 24시간",
    last_7d: "최근 7일",
  };
  return labels[period] || period;
}
