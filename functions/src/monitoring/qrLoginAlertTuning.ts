/**
 * 📊 QR 로그인 알림 기준선 튜닝 유틸리티
 * 
 * 실제 운영 데이터를 기반으로 임계치를 계산하는 도구
 * 
 * 사용 방법:
 * 1. 최근 24~48시간 데이터 수집
 * 2. 이 함수로 기준선 계산
 * 3. 계산된 값을 THRESHOLDS에 반영
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export interface TuningResult {
  // 성공률 통계
  successRate: {
    mean: number; // 평균
    min: number; // 최소
    max: number; // 최대
    stdDev: number; // 표준편차
    p50: number; // 중앙값
    recommended: number; // 추천 임계치 (평균 - 2σ)
  };
  
  // SMS 실패율 통계
  smsFailureRate: {
    mean: number;
    max: number;
    stdDev: number;
    recommended: number; // 추천 임계치 (평균 + 2σ)
  };
  
  // 로그인 시간 통계
  loginTime: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    recommended: number; // 추천 임계치 (P95)
  };
  
  // 만료율 통계
  expirationRate: {
    mean: number;
    max: number;
    stdDev: number;
    recommended: number; // 추천 임계치 (평균 + 2σ)
  };
  
  // 시간대별 통계
  timeBased: {
    peak: {
      hours: number[]; // 피크 시간대 (예: [12, 13, 18, 19, 20, 21])
      successRate: number;
      smsFailureRate: number;
      loginTime: number;
      expirationRate: number;
    };
    offPeak: {
      successRate: number;
      smsFailureRate: number;
      loginTime: number;
      expirationRate: number;
    };
  };
}

/**
 * 최근 N시간 데이터를 분석하여 기준선 계산
 * 
 * @param hoursBack 분석 기간 (시간) - 기본 48시간
 * @param peakHours 피크 시간대 (시간 배열) - 기본 [12, 13, 14, 18, 19, 20, 21]
 */
export async function calculateThresholds(
  hoursBack: number = 48,
  peakHours: number[] = [12, 13, 14, 18, 19, 20, 21]
): Promise<TuningResult> {
  logger.info("📊 [qrLoginAlertTuning] 기준선 계산 시작:", { hoursBack, peakHours });

  const now = Date.now();
  const startTime = now - (hoursBack * 60 * 60 * 1000);
  const startTimestamp = Timestamp.fromMillis(startTime);
  const endTimestamp = Timestamp.fromMillis(now);

  // 1. eventLogs에서 QR 로그인 이벤트 조회
  const eventLogsRef = db.collection("eventLogs");
  const eventLogsQuery = eventLogsRef
    .where("event", ">=", "qr_login_")
    .where("event", "<", "qr_login_z")
    .where("createdAt", ">=", startTimestamp)
    .where("createdAt", "<=", endTimestamp)
    .orderBy("createdAt", "desc");

  const eventLogsSnapshot = await eventLogsQuery.get();
  const events = eventLogsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const qrEvents = events.filter(
    (event: any) => event.event && event.event.startsWith("qr_login_")
  );

  // 2. qrLoginLogs에서 서버 로그 조회
  const qrLoginLogsRef = db.collection("qrLoginLogs");
  const serverLogsQuery = qrLoginLogsRef
    .where("timestamp", ">=", startTimestamp)
    .where("timestamp", "<=", endTimestamp)
    .orderBy("timestamp", "desc");

  const serverLogsSnapshot = await serverLogsQuery.get();
  const serverLogs = serverLogsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 3. 통계 계산
  const sessions = new Set<string>();
  const successfulSessions = new Set<string>();
  const failedSessions = new Set<string>();
  const expiredSessions = new Set<string>();
  let smsFailed = 0;
  const loginTimes: number[] = [];
  const sessionTimestamps: Record<string, { created?: number; success?: number; hour?: number }> = {};

  // 시간대별 통계
  const peakStats = {
    sessions: 0,
    successes: 0,
    smsFailed: 0,
    loginTimes: [] as number[],
    expired: 0,
  };
  const offPeakStats = {
    sessions: 0,
    successes: 0,
    smsFailed: 0,
    loginTimes: [] as number[],
    expired: 0,
  };

  // 클라이언트 이벤트 처리
  qrEvents.forEach((event: any) => {
    const sessionId = event.sessionId;
    if (!sessionId) return;

    sessions.add(sessionId);

    const eventTime = event.createdAt?.toMillis?.() || (event.createdAt?.seconds || 0) * 1000 || Date.now();
    const eventHour = new Date(eventTime).getHours();
    const isPeak = peakHours.includes(eventHour);

    // 세션 생성 시간 기록
    if (event.event === "qr_login_session_created") {
      sessionTimestamps[sessionId] = {
        created: eventTime,
        hour: eventHour,
      };
      
      if (isPeak) peakStats.sessions++;
      else offPeakStats.sessions++;
    }

    // 성공/실패 추적
    if (event.event === "qr_login_success") {
      successfulSessions.add(sessionId);

      const created = sessionTimestamps[sessionId]?.created;
      if (created) {
        const duration = (eventTime - created) / 1000; // 초 단위
        loginTimes.push(duration);
        sessionTimestamps[sessionId].success = eventTime;

        if (isPeak) {
          peakStats.successes++;
          peakStats.loginTimes.push(duration);
        } else {
          offPeakStats.successes++;
          offPeakStats.loginTimes.push(duration);
        }
      }
    } else if (event.event === "qr_login_failed") {
      failedSessions.add(sessionId);

      const errorCode = event.errorCode || "unknown";
      if (errorCode.includes("sms") || errorCode.includes("SMS")) {
        smsFailed++;
        if (isPeak) peakStats.smsFailed++;
        else offPeakStats.smsFailed++;
      }
    } else if (event.event === "qr_login_session_expired") {
      expiredSessions.add(sessionId);
      if (isPeak) peakStats.expired++;
      else offPeakStats.expired++;
    }
  });

  // 서버 로그 처리
  serverLogs.forEach((log: any) => {
    const sessionId = log.sessionId;
    if (!sessionId) return;

    const logTime = log.timestamp?.toMillis?.() || (log.timestamp?.seconds || 0) * 1000 || Date.now();
    const logHour = new Date(logTime).getHours();
    const isPeak = peakHours.includes(logHour);

    if (log.eventType === "session_expired") {
      expiredSessions.add(sessionId);
      if (isPeak) peakStats.expired++;
      else offPeakStats.expired++;
    }
  });

  // 4. 통계 계산
  const totalSessions = sessions.size || 1;
  const successRateValues: number[] = [];
  const smsFailureRateValues: number[] = [];
  const expirationRateValues: number[] = [];

  // 시간대별 성공률 계산 (1시간 단위)
  const hourlyStats: Record<number, { sessions: number; successes: number; smsFailed: number; expired: number }> = {};
  
  qrEvents.forEach((event: any) => {
    const sessionId = event.sessionId;
    if (!sessionId) return;

    const eventTime = event.createdAt?.toMillis?.() || (event.createdAt?.seconds || 0) * 1000 || Date.now();
    const hour = new Date(eventTime).getHours();

    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { sessions: 0, successes: 0, smsFailed: 0, expired: 0 };
    }

    if (event.event === "qr_login_session_created") {
      hourlyStats[hour].sessions++;
    } else if (event.event === "qr_login_success") {
      hourlyStats[hour].successes++;
    } else if (event.event === "qr_login_failed") {
      const errorCode = event.errorCode || "unknown";
      if (errorCode.includes("sms") || errorCode.includes("SMS")) {
        hourlyStats[hour].smsFailed++;
      }
    } else if (event.event === "qr_login_session_expired") {
      hourlyStats[hour].expired++;
    }
  });

  // 시간대별 성공률/실패율 계산
  Object.values(hourlyStats).forEach((stats) => {
    if (stats.sessions > 0) {
      successRateValues.push((stats.successes / stats.sessions) * 100);
      smsFailureRateValues.push((stats.smsFailed / stats.sessions) * 100);
      expirationRateValues.push((stats.expired / stats.sessions) * 100);
    }
  });

  // 전체 통계
  const overallSuccessRate = (successfulSessions.size / totalSessions) * 100;
  const overallSmsFailureRate = (smsFailed / totalSessions) * 100;
  const overallExpirationRate = (expiredSessions.size / totalSessions) * 100;

  // 통계 함수들
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const stdDev = (arr: number[], m: number) => {
    if (arr.length === 0) return 0;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  // 성공률 통계
  const successRateMean = mean(successRateValues.length > 0 ? successRateValues : [overallSuccessRate]);
  const successRateStdDev = stdDev(successRateValues, successRateMean);
  const successRateMin = successRateValues.length > 0 ? Math.min(...successRateValues) : overallSuccessRate;
  const successRateMax = successRateValues.length > 0 ? Math.max(...successRateValues) : overallSuccessRate;
  const successRateP50 = percentile(successRateValues.length > 0 ? successRateValues : [overallSuccessRate], 50);

  // SMS 실패율 통계
  const smsFailureRateMean = mean(smsFailureRateValues.length > 0 ? smsFailureRateValues : [overallSmsFailureRate]);
  const smsFailureRateStdDev = stdDev(smsFailureRateValues, smsFailureRateMean);
  const smsFailureRateMax = smsFailureRateValues.length > 0 ? Math.max(...smsFailureRateValues) : overallSmsFailureRate;

  // 로그인 시간 통계
  const loginTimeMean = mean(loginTimes);
  const loginTimeP50 = percentile(loginTimes, 50);
  const loginTimeP95 = percentile(loginTimes, 95);
  const loginTimeP99 = percentile(loginTimes, 99);

  // 만료율 통계
  const expirationRateMean = mean(expirationRateValues.length > 0 ? expirationRateValues : [overallExpirationRate]);
  const expirationRateStdDev = stdDev(expirationRateValues, expirationRateMean);
  const expirationRateMax = expirationRateValues.length > 0 ? Math.max(...expirationRateValues) : overallExpirationRate;

  // 피크/오프피크 통계
  const peakSuccessRate = peakStats.sessions > 0 ? (peakStats.successes / peakStats.sessions) * 100 : 0;
  const peakSmsFailureRate = peakStats.sessions > 0 ? (peakStats.smsFailed / peakStats.sessions) * 100 : 0;
  const peakLoginTime = mean(peakStats.loginTimes);
  const peakExpirationRate = peakStats.sessions > 0 ? (peakStats.expired / peakStats.sessions) * 100 : 0;

  const offPeakSuccessRate = offPeakStats.sessions > 0 ? (offPeakStats.successes / offPeakStats.sessions) * 100 : 0;
  const offPeakSmsFailureRate = offPeakStats.sessions > 0 ? (offPeakStats.smsFailed / offPeakStats.sessions) * 100 : 0;
  const offPeakLoginTime = mean(offPeakStats.loginTimes);
  const offPeakExpirationRate = offPeakStats.sessions > 0 ? (offPeakStats.expired / offPeakStats.sessions) * 100 : 0;

  const result: TuningResult = {
    successRate: {
      mean: Math.round(successRateMean * 10) / 10,
      min: Math.round(successRateMin * 10) / 10,
      max: Math.round(successRateMax * 10) / 10,
      stdDev: Math.round(successRateStdDev * 10) / 10,
      p50: Math.round(successRateP50 * 10) / 10,
      recommended: Math.round(Math.max(0, successRateMean - 2 * successRateStdDev) * 10) / 10,
    },
    smsFailureRate: {
      mean: Math.round(smsFailureRateMean * 10) / 10,
      max: Math.round(smsFailureRateMax * 10) / 10,
      stdDev: Math.round(smsFailureRateStdDev * 10) / 10,
      recommended: Math.round((smsFailureRateMean + 2 * smsFailureRateStdDev) * 10) / 10,
    },
    loginTime: {
      mean: Math.round(loginTimeMean),
      p50: Math.round(loginTimeP50),
      p95: Math.round(loginTimeP95),
      p99: Math.round(loginTimeP99),
      recommended: Math.round(loginTimeP95),
    },
    expirationRate: {
      mean: Math.round(expirationRateMean * 10) / 10,
      max: Math.round(expirationRateMax * 10) / 10,
      stdDev: Math.round(expirationRateStdDev * 10) / 10,
      recommended: Math.round((expirationRateMean + 2 * expirationRateStdDev) * 10) / 10,
    },
    timeBased: {
      peak: {
        hours: peakHours,
        successRate: Math.round(peakSuccessRate * 10) / 10,
        smsFailureRate: Math.round(peakSmsFailureRate * 10) / 10,
        loginTime: Math.round(peakLoginTime),
        expirationRate: Math.round(peakExpirationRate * 10) / 10,
      },
      offPeak: {
        successRate: Math.round(offPeakSuccessRate * 10) / 10,
        smsFailureRate: Math.round(offPeakSmsFailureRate * 10) / 10,
        loginTime: Math.round(offPeakLoginTime),
        expirationRate: Math.round(offPeakExpirationRate * 10) / 10,
      },
    },
  };

  logger.info("✅ [qrLoginAlertTuning] 기준선 계산 완료:", {
    recommendedSuccessRate: result.successRate.recommended,
    recommendedSmsFailureRate: result.smsFailureRate.recommended,
    recommendedLoginTime: result.loginTime.recommended,
    recommendedExpirationRate: result.expirationRate.recommended,
  });

  return result;
}
