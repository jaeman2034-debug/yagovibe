/**
 * 🔥 Alert Job - 자동 알림 규칙
 * 
 * Week6 핵심: 위험 신호 자동 감지 및 알림
 */

import { prisma } from "../data/prisma";

/**
 * 위험 신호 감지 및 알림
 */
export async function detectAlert(): Promise<void> {
  try {
    // 최신 KPI 조회
    const kpi = await prisma.dailyKpi.findFirst({
      orderBy: { date: "desc" },
    });

    if (!kpi) {
      return;
    }

    const alerts: string[] = [];

    // 1. CTR 저조 알림
    if (kpi.storyCtr < 0.01) {
      alerts.push(`[ALERT] CTR LOW: ${(kpi.storyCtr * 100).toFixed(2)}% (threshold: 1%)`);
    }

    // 2. 결제 실패 알림
    if (kpi.payFail > 10) {
      alerts.push(`[ALERT] PAY FAIL: ${kpi.payFail} failures (threshold: 10)`);
    }

    // 3. API 에러 알림
    if (kpi.apiError > 50) {
      alerts.push(`[ALERT] API ERROR: ${kpi.apiError} errors (threshold: 50)`);
    }

    // 4. 스토리 채움률 저조
    if (kpi.storyFillRate < 0.5) {
      alerts.push(
        `[ALERT] STORY FILL RATE LOW: ${(kpi.storyFillRate * 100).toFixed(0)}% (threshold: 50%)`
      );
    }

    // 5. 오프라인률 높음
    if (kpi.offlineRate > 0.3) {
      alerts.push(
        `[ALERT] OFFLINE RATE HIGH: ${(kpi.offlineRate * 100).toFixed(0)}% (threshold: 30%)`
      );
    }

    // 6. 예약 전환율 저조
    if (kpi.bookingCr < 0.05) {
      alerts.push(
        `[ALERT] BOOKING CR LOW: ${(kpi.bookingCr * 100).toFixed(2)}% (threshold: 5%)`
      );
    }

    // 알림 출력
    if (alerts.length > 0) {
      console.warn(`[ALERT_DETECT] ${alerts.length} alerts detected:`);
      alerts.forEach((alert) => console.warn(alert));
    } else {
      console.log(`[ALERT_DETECT] No alerts (${kpi.date}, ${kpi.region})`);
    }

    // 실제 운영 시: Slack/Email/푸시 알림 발송
    // await sendSlackAlert(alerts);
    // await sendEmailAlert(alerts);
  } catch (error) {
    console.error("[ALERT_DETECT] Error:", error);
  }
}

/**
 * 특정 지역의 위험 신호 감지
 */
export async function detectAlertForRegion(region: string): Promise<void> {
  try {
    const kpi = await prisma.dailyKpi.findFirst({
      where: { region },
      orderBy: { date: "desc" },
    });

    if (!kpi) {
      return;
    }

    const alerts: string[] = [];

    if (kpi.storyCtr < 0.01) {
      alerts.push(`[ALERT] ${region}: CTR LOW`);
    }

    if (kpi.payFail > 10) {
      alerts.push(`[ALERT] ${region}: PAY FAIL`);
    }

    if (alerts.length > 0) {
      console.warn(`[ALERT_DETECT] ${region}:`, alerts);
    }
  } catch (error) {
    console.error(`[ALERT_DETECT] Error for ${region}:`, error);
  }
}
