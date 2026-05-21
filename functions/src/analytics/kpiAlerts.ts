/**
 * 🔥 KPI 알람 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - KPI 임계값 체크
 * - 알람 전송 (Slack, 이메일)
 */

import { logger } from "firebase-functions/v2";
import type { KPIDashboard } from "./kpiQueries";

interface AlertThreshold {
  metric: string;
  operator: ">" | "<" | ">=" | "<=";
  value: number;
  severity: "critical" | "warning" | "info";
  channels: ("email" | "slack" | "push")[];
}

const ALERT_THRESHOLDS: AlertThreshold[] = [
  // 전환율 지표
  {
    metric: "conversion.registrationToTrade",
    operator: "<",
    value: 36,
    severity: "critical",
    channels: ["email", "slack"],
  },
  {
    metric: "conversion.imageInclusion",
    operator: "<",
    value: 98,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "conversion.aiTitleAdoption",
    operator: "<",
    value: 75,
    severity: "warning",
    channels: ["slack"],
  },
  
  // 리텐션 지표
  {
    metric: "retention.dauMau",
    operator: "<",
    value: 40,
    severity: "critical",
    channels: ["email", "slack"],
  },
  {
    metric: "retention.weeklyReturn",
    operator: "<",
    value: 3.5,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "retention.noShow",
    operator: ">",
    value: 4,
    severity: "critical",
    channels: ["email", "slack"],
  },
  
  // 수익화 지표
  {
    metric: "revenue.arpu",
    operator: "<",
    value: 2000,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "revenue.adCTR",
    operator: "<",
    value: 2.5,
    severity: "info",
    channels: ["slack"],
  },
  {
    metric: "revenue.monthlyRevenue",
    operator: "<",
    value: 230000000,
    severity: "critical",
    channels: ["email", "slack"],
  },
];

/**
 * KPI 임계값 체크 및 알람 전송
 */
export async function checkKPIAlerts(kpis: KPIDashboard): Promise<void> {
  const alerts: string[] = [];

  for (const threshold of ALERT_THRESHOLDS) {
    const metricValue = getNestedValue(kpis, threshold.metric);
    
    if (metricValue === undefined) continue;

    let shouldAlert = false;
    
    switch (threshold.operator) {
      case "<":
        shouldAlert = metricValue < threshold.value;
        break;
      case ">":
        shouldAlert = metricValue > threshold.value;
        break;
      case "<=":
        shouldAlert = metricValue <= threshold.value;
        break;
      case ">=":
        shouldAlert = metricValue >= threshold.value;
        break;
    }

    if (shouldAlert) {
      const message = `🚨 [${threshold.severity.toUpperCase()}] ${threshold.metric}: ${metricValue} (목표: ${threshold.operator} ${threshold.value})`;
      alerts.push(message);
      
      // 알람 전송
      await sendAlerts(message, threshold.channels, threshold.severity);
    }
  }

  if (alerts.length > 0) {
    logger.warn("[checkKPIAlerts] KPI 알람 발생:", { alerts });
  }
}

/**
 * 중첩된 객체에서 값 추출
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, p) => o?.[p], obj);
}

/**
 * 알람 전송
 */
async function sendAlerts(
  message: string,
  channels: string[],
  severity: string
): Promise<void> {
  // Slack, 이메일, 푸시 알림 전송
  // TODO: 실제 알림 서비스 연동
  logger.info(`[sendAlerts] ${severity} 알람 전송:`, {
    message,
    channels,
  });
}
