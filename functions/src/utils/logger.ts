/**
 * 🔥 운영용 구조화 로거 (실전 DevOps 세트)
 * 
 * 역할:
 * - 구조화된 JSON 로그 출력
 * - 모니터링 지표 수집
 * - 에러 추적
 */

import { logger } from "firebase-functions/v2";

/**
 * 🔥 구조화 로그 (운영용)
 * 
 * @param type - 로그 타입 (APPROVE, CHAT_CREATE, PUSH, ERROR 등)
 * @param data - 로그 데이터
 */
export function log(type: string, data: Record<string, any> = {}) {
  const logEntry = {
    time: new Date().toISOString(),
    type,
    ...data,
  };

  // 🔥 Firebase Functions 로거 사용 (Cloud Logging 통합)
  logger.info(JSON.stringify(logEntry));
}

/**
 * 🔥 에러 로그
 */
export function logError(type: string, error: any, data: Record<string, any> = {}) {
  const logEntry = {
    time: new Date().toISOString(),
    type: `ERROR_${type}`,
    error: {
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack,
    },
    ...data,
  };

  logger.error(JSON.stringify(logEntry));
}

/**
 * 🔥 핵심 지표 로그
 */
export function logMetric(metric: string, value: number, data: Record<string, any> = {}) {
  const logEntry = {
    time: new Date().toISOString(),
    type: "METRIC",
    metric,
    value,
    ...data,
  };

  logger.info(JSON.stringify(logEntry));
}
