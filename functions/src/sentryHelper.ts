/**
 * Cloud Functions용 Sentry 헬퍼
 * Functions에서 에러 추적 및 로깅을 위한 유틸리티
 */

import * as logger from "firebase-functions/logger";

/**
 * 에러를 로깅하고 Sentry에 전송 (Functions용)
 * 실제 Sentry SDK는 Functions에서 사용하지 않고, 로깅만 수행
 * 필요시 Sentry Node SDK를 추가할 수 있음
 */
export function logError(
  error: Error | unknown,
  context?: {
    functionName?: string;
    userId?: string;
    additionalData?: Record<string, unknown>;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error("🔥 Functions Error:", {
    message: errorMessage,
    stack: errorStack,
    functionName: context?.functionName,
    userId: context?.userId,
    additionalData: context?.additionalData,
    timestamp: new Date().toISOString(),
  });

  // TODO: 실제 Sentry Node SDK를 추가하려면:
  // import * as Sentry from "@sentry/node";
  // Sentry.captureException(error, {
  //   tags: {
  //     functionName: context?.functionName,
  //   },
  //   user: context?.userId ? { id: context.userId } : undefined,
  //   extra: context?.additionalData,
  // });
}

/**
 * 경고 로깅
 */
export function logWarning(
  message: string,
  context?: Record<string, unknown>
): void {
  logger.warn("⚠️ Functions Warning:", {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 정보 로깅
 */
export function logInfo(
  message: string,
  context?: Record<string, unknown>
): void {
  logger.info("ℹ️ Functions Info:", {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

