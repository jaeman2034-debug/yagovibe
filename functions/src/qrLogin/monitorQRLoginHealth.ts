/**
 * 🔔 QR 로그인 건강 상태 모니터링 (스케줄 함수)
 * 
 * 주기적으로 QR 로그인 통계를 집계하고 임계치를 체크하여 알림 전송
 * 
 * 임계치:
 * - 성공률 < 90% → Critical
 * - SMS 실패율 > 5% → Warning
 * - 평균 로그인 시간 > 60초 → Warning
 * - 세션 만료 급증 (최근 1시간 만료율 > 20%) → Warning
 * - 에러 급증 (최근 1시간 에러율 > 10%) → Critical
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { aggregateQRLoginStats } from "./aggregateQRLoginStats";
import { sendAlert, QRLoginAlert } from "./notifyQRLoginAlerts";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

/**
 * 임계치 설정
 */
const THRESHOLDS = {
  successRate: {
    warning: 95, // 95% 미만이면 Warning
    critical: 90, // 90% 미만이면 Critical
  },
  smsFailureRate: {
    warning: 3, // 3% 초과면 Warning
    critical: 5, // 5% 초과면 Critical
  },
  avgLoginTime: {
    warning: 45, // 45초 초과면 Warning
    critical: 60, // 60초 초과면 Critical
  },
  expirationRate: {
    warning: 15, // 15% 초과면 Warning
    critical: 20, // 20% 초과면 Critical
  },
  errorRate: {
    warning: 5, // 5% 초과면 Warning
    critical: 10, // 10% 초과면 Critical
  },
};

/**
 * QR 로그인 건강 상태 체크 및 알림
 */
async function checkQRLoginHealth(hoursBack: number = 24): Promise<void> {
  logger.info("🔔 [monitorQRLoginHealth] 건강 상태 체크 시작:", { hoursBack });

  try {
    // 통계 집계
    const stats = await aggregateQRLoginStats(hoursBack);

    const alerts: QRLoginAlert[] = [];

    // 1. 성공률 체크
    if (stats.totalSessions > 0) {
      if (stats.successRate < THRESHOLDS.successRate.critical) {
        alerts.push({
          type: "success_rate",
          severity: "critical",
          message: `QR 로그인 성공률이 ${stats.successRate.toFixed(1)}%로 임계치(${THRESHOLDS.successRate.critical}%)를 밑돌았습니다.`,
          stats: {
            current: stats.successRate,
            threshold: THRESHOLDS.successRate.critical,
            period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
          },
          details: {
            totalSessions: stats.totalSessions,
            successfulLogins: stats.successfulLogins,
            failedLogins: stats.failedLogins,
            expiredSessions: stats.expiredSessions,
          },
        });
      } else if (stats.successRate < THRESHOLDS.successRate.warning) {
        alerts.push({
          type: "success_rate",
          severity: "warning",
          message: `QR 로그인 성공률이 ${stats.successRate.toFixed(1)}%로 경고 수준(${THRESHOLDS.successRate.warning}%)에 근접했습니다.`,
          stats: {
            current: stats.successRate,
            threshold: THRESHOLDS.successRate.warning,
            period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
          },
          details: {
            totalSessions: stats.totalSessions,
            successfulLogins: stats.successfulLogins,
            failedLogins: stats.failedLogins,
          },
        });
      }
    }

    // 2. SMS 실패율 체크
    if (stats.totalSessions > 0) {
      const smsFailureRate =
        (stats.failureReasons.smsFailed / stats.totalSessions) * 100;
      if (smsFailureRate > THRESHOLDS.smsFailureRate.critical) {
        alerts.push({
          type: "sms_failure_rate",
          severity: "critical",
          message: `SMS 실패율이 ${smsFailureRate.toFixed(1)}%로 임계치(${THRESHOLDS.smsFailureRate.critical}%)를 초과했습니다.`,
          stats: {
            current: smsFailureRate,
            threshold: THRESHOLDS.smsFailureRate.critical,
            period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
          },
          details: {
            smsFailed: stats.failureReasons.smsFailed,
            totalSessions: stats.totalSessions,
          },
        });
      } else if (smsFailureRate > THRESHOLDS.smsFailureRate.warning) {
        alerts.push({
          type: "sms_failure_rate",
          severity: "warning",
          message: `SMS 실패율이 ${smsFailureRate.toFixed(1)}%로 경고 수준(${THRESHOLDS.smsFailureRate.warning}%)에 근접했습니다.`,
          stats: {
            current: smsFailureRate,
            threshold: THRESHOLDS.smsFailureRate.warning,
            period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
          },
          details: {
            smsFailed: stats.failureReasons.smsFailed,
            totalSessions: stats.totalSessions,
          },
        });
      }
    }

    // 3. 평균 로그인 시간 체크
    if (stats.avgTimeToLogin > THRESHOLDS.avgLoginTime.critical) {
      alerts.push({
        type: "avg_login_time",
        severity: "critical",
        message: `평균 로그인 시간이 ${stats.avgTimeToLogin}초로 임계치(${THRESHOLDS.avgLoginTime.critical}초)를 초과했습니다.`,
        stats: {
          current: stats.avgTimeToLogin,
          threshold: THRESHOLDS.avgLoginTime.critical,
          period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
        },
        details: {
          minTime: stats.minTimeToLogin,
          maxTime: stats.maxTimeToLogin,
        },
      });
    } else if (stats.avgTimeToLogin > THRESHOLDS.avgLoginTime.warning) {
      alerts.push({
        type: "avg_login_time",
        severity: "warning",
        message: `평균 로그인 시간이 ${stats.avgTimeToLogin}초로 경고 수준(${THRESHOLDS.avgLoginTime.warning}초)에 근접했습니다.`,
        stats: {
          current: stats.avgTimeToLogin,
          threshold: THRESHOLDS.avgLoginTime.warning,
          period: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
        },
        details: {
          minTime: stats.minTimeToLogin,
          maxTime: stats.maxTimeToLogin,
        },
      });
    }

    // 4. 세션 만료 급증 체크 (최근 1시간만)
    if (hoursBack === 1 && stats.totalSessions > 0) {
      const expirationRate = (stats.expiredSessions / stats.totalSessions) * 100;
      if (expirationRate > THRESHOLDS.expirationRate.critical) {
        alerts.push({
          type: "expiration_surge",
          severity: "critical",
          message: `최근 1시간 동안 세션 만료율이 ${expirationRate.toFixed(1)}%로 급증했습니다.`,
          stats: {
            current: expirationRate,
            threshold: THRESHOLDS.expirationRate.critical,
            period: "last_hour",
          },
          details: {
            expiredSessions: stats.expiredSessions,
            totalSessions: stats.totalSessions,
          },
        });
      } else if (expirationRate > THRESHOLDS.expirationRate.warning) {
        alerts.push({
          type: "expiration_surge",
          severity: "warning",
          message: `최근 1시간 동안 세션 만료율이 ${expirationRate.toFixed(1)}%로 증가했습니다.`,
          stats: {
            current: expirationRate,
            threshold: THRESHOLDS.expirationRate.warning,
            period: "last_hour",
          },
          details: {
            expiredSessions: stats.expiredSessions,
            totalSessions: stats.totalSessions,
          },
        });
      }
    }

    // 5. 에러 급증 체크 (최근 1시간만)
    if (hoursBack === 1 && stats.totalSessions > 0) {
      const errorRate = ((stats.failedLogins - stats.failureReasons.sessionExpired) / stats.totalSessions) * 100;
      if (errorRate > THRESHOLDS.errorRate.critical) {
        alerts.push({
          type: "error_surge",
          severity: "critical",
          message: `최근 1시간 동안 에러율이 ${errorRate.toFixed(1)}%로 급증했습니다.`,
          stats: {
            current: errorRate,
            threshold: THRESHOLDS.errorRate.critical,
            period: "last_hour",
          },
          details: {
            failedLogins: stats.failedLogins,
            totalSessions: stats.totalSessions,
            failureReasons: stats.failureReasons,
          },
        });
      } else if (errorRate > THRESHOLDS.errorRate.warning) {
        alerts.push({
          type: "error_surge",
          severity: "warning",
          message: `최근 1시간 동안 에러율이 ${errorRate.toFixed(1)}%로 증가했습니다.`,
          stats: {
            current: errorRate,
            threshold: THRESHOLDS.errorRate.warning,
            period: "last_hour",
          },
          details: {
            failedLogins: stats.failedLogins,
            totalSessions: stats.totalSessions,
          },
        });
      }
    }

    // 알림 전송
    if (alerts.length > 0) {
      logger.warn("⚠️ [monitorQRLoginHealth] 알림 발생:", {
        alertCount: alerts.length,
        alerts: alerts.map((a) => ({ type: a.type, severity: a.severity })),
      });

      // 모든 알림 전송 (병렬 처리)
      const results = await Promise.allSettled(
        alerts.map((alert) => sendAlert(alert))
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
      logger.info("✅ [monitorQRLoginHealth] 알림 전송 완료:", {
        total: alerts.length,
        success: successCount,
        failed: alerts.length - successCount,
      });
    } else {
      logger.info("✅ [monitorQRLoginHealth] 모든 지표 정상 범위 내");
    }
  } catch (error: any) {
    logger.error("❌ [monitorQRLoginHealth] 건강 상태 체크 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 매시간 QR 로그인 건강 상태 체크 (빠른 대응용)
 */
export const monitorQRLoginHealthHourly = onSchedule(
  {
    schedule: "0 * * * *", // 매시간 정각
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    await checkQRLoginHealth(1); // 최근 1시간
  }
);

/**
 * 매일 QR 로그인 건강 상태 체크 (종합 리포트용)
 */
export const monitorQRLoginHealthDaily = onSchedule(
  {
    schedule: "0 9 * * *", // 매일 오전 9시
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    await checkQRLoginHealth(24); // 최근 24시간
  }
);
