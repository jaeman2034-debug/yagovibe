/**
 * ✅ COMMIT 18-1: Anomaly Detection Hooks
 * Functions에서 anomaly 탐지 시 플러그인 호출
 */

import * as logger from "firebase-functions/logger";

/**
 * Anomaly 탐지 시 플러그인 훅 실행
 * (실제 플러그인 시스템은 클라이언트에서만 동작하므로, 여기서는 로그만)
 */
export async function onAnomalyDetected(tenantId: string, payload: {
  metric: string;
  value: number;
  anomaly?: {
    level: "critical" | "warning";
    kind?: "zero" | "drop" | "z" | "drift";
  };
}): Promise<void> {
  try {
    // Datadog metric (stdout 기반)
    if (process.env.DATADOG_API_KEY) {
      console.log(
        JSON.stringify({
          dd_metric: "anomaly.detected",
          value: 1,
          tags: {
            tenantId,
            metric: payload.metric,
            level: payload.anomaly?.level,
          },
        })
      );

      console.log(
        JSON.stringify({
          dd: true,
          message: "anomaly_detected",
          tenantId,
          metric: payload.metric,
          level: payload.anomaly?.level,
        })
      );
    }
  } catch (error: any) {
    logger.warn(`[onAnomalyDetected] 플러그인 호출 실패: ${error?.message}`);
    // 실패해도 본 흐름 영향 0
  }
}

