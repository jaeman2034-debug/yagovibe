/**
 * 📊 QR 로그인 통계 집계 (서버 사이드)
 * 
 * Firestore에서 eventLogs와 qrLoginLogs를 조회하여 통계 계산
 */

import { getFirestore, Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

export interface QRLoginAggregatedStats {
  // 전체 통계
  totalSessions: number;
  successfulLogins: number;
  failedLogins: number;
  expiredSessions: number;
  successRate: number; // 성공률 (%)
  
  // 시간 통계
  avgTimeToLogin: number; // 평균 로그인 소요 시간 (초)
  minTimeToLogin: number;
  maxTimeToLogin: number;
  
  // 실패 원인 분석
  failureReasons: {
    smsFailed: number;
    loginFailed: number;
    sessionExpired: number;
    other: number;
  };
  
  // 플랫폼별 통계
  platformStats: {
    desktop: {
      sessions: number;
      successes: number;
      failures: number;
    };
    mobile: {
      sessions: number;
      successes: number;
      failures: number;
    };
  };
  
  // 기간별 통계
  period: {
    start: Timestamp;
    end: Timestamp;
    label: string;
  };
}

/**
 * QR 로그인 통계 집계
 * @param hoursBack 통계 기간 (시간) - 기본 24시간
 */
export async function aggregateQRLoginStats(
  hoursBack: number = 24
): Promise<QRLoginAggregatedStats> {
  const db = getFirestore();
  const now = Date.now();
  const startTime = now - (hoursBack * 60 * 60 * 1000);
  const startTimestamp = Timestamp.fromMillis(startTime);
  const endTimestamp = Timestamp.fromMillis(now);

  logger.info("📊 [aggregateQRLoginStats] 통계 집계 시작:", {
    hoursBack,
    startTime: startTimestamp.toDate().toISOString(),
    endTime: endTimestamp.toDate().toISOString(),
  });

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

  // 클라이언트에서 QR 로그인 이벤트만 필터링
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
  const failureReasons: QRLoginAggregatedStats["failureReasons"] = {
    smsFailed: 0,
    loginFailed: 0,
    sessionExpired: 0,
    other: 0,
  };
  const platformStats: QRLoginAggregatedStats["platformStats"] = {
    desktop: { sessions: 0, successes: 0, failures: 0 },
    mobile: { sessions: 0, successes: 0, failures: 0 },
  };
  const loginTimes: number[] = []; // 로그인 소요 시간 배열

  // 이벤트별 처리
  const sessionTimestamps: Record<string, { created?: number; success?: number }> = {};

  qrEvents.forEach((event: any) => {
    const sessionId = event.sessionId;
    if (!sessionId) return;

    sessions.add(sessionId);

    // 플랫폼별 통계
    const platform = event.platform || "unknown";
    if (platform === "desktop") {
      platformStats.desktop.sessions++;
    } else if (platform === "mobile") {
      platformStats.mobile.sessions++;
    }

    // 세션 생성 시간 기록
    if (event.event === "qr_login_session_created") {
      sessionTimestamps[sessionId] = {
        created:
          event.createdAt?.toMillis?.() ||
          (event.createdAt?.seconds || 0) * 1000 ||
          Date.now(),
      };
    }

    // 성공/실패 추적
    if (event.event === "qr_login_success") {
      successfulSessions.add(sessionId);
      if (platform === "desktop") {
        platformStats.desktop.successes++;
      } else if (platform === "mobile") {
        platformStats.mobile.successes++;
      }

      // 로그인 소요 시간 계산
      const created = sessionTimestamps[sessionId]?.created;
      if (created) {
        const successTime =
          event.createdAt?.toMillis?.() ||
          (event.createdAt?.seconds || 0) * 1000 ||
          Date.now();
        const duration = (successTime - created) / 1000; // 초 단위
        loginTimes.push(duration);
        sessionTimestamps[sessionId].success = successTime;
      }
    } else if (event.event === "qr_login_failed") {
      failedSessions.add(sessionId);
      if (platform === "desktop") {
        platformStats.desktop.failures++;
      } else if (platform === "mobile") {
        platformStats.mobile.failures++;
      }

      // 실패 원인 분석
      const errorCode = event.errorCode || "unknown";
      if (errorCode.includes("sms") || errorCode.includes("SMS")) {
        failureReasons.smsFailed++;
      } else if (errorCode.includes("login") || errorCode.includes("signIn")) {
        failureReasons.loginFailed++;
      } else {
        failureReasons.other++;
      }
    } else if (event.event === "qr_login_session_expired") {
      expiredSessions.add(sessionId);
      failureReasons.sessionExpired++;
    }
  });

  // 서버 로그에서도 만료/에러 추적
  serverLogs.forEach((log: any) => {
    const sessionId = log.sessionId;
    if (!sessionId) return;

    if (log.eventType === "session_expired") {
      expiredSessions.add(sessionId);
      failureReasons.sessionExpired++;
    } else if (log.eventType === "error" || log.eventType === "token_issue_failed") {
      if (!successfulSessions.has(sessionId) && !failedSessions.has(sessionId)) {
        failedSessions.add(sessionId);
        failureReasons.other++;
      }
    }
  });

  // 평균 시간 계산
  const avgTimeToLogin =
    loginTimes.length > 0
      ? loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length
      : 0;
  const minTimeToLogin = loginTimes.length > 0 ? Math.min(...loginTimes) : 0;
  const maxTimeToLogin = loginTimes.length > 0 ? Math.max(...loginTimes) : 0;

  const stats: QRLoginAggregatedStats = {
    totalSessions: sessions.size,
    successfulLogins: successfulSessions.size,
    failedLogins: failedSessions.size,
    expiredSessions: expiredSessions.size,
    successRate:
      sessions.size > 0 ? (successfulSessions.size / sessions.size) * 100 : 0,
    avgTimeToLogin: Math.round(avgTimeToLogin),
    minTimeToLogin: Math.round(minTimeToLogin),
    maxTimeToLogin: Math.round(maxTimeToLogin),
    failureReasons,
    platformStats,
    period: {
      start: startTimestamp,
      end: endTimestamp,
      label: hoursBack === 1 ? "last_hour" : hoursBack === 24 ? "last_24h" : "last_7d",
    },
  };

  logger.info("✅ [aggregateQRLoginStats] 통계 집계 완료:", {
    totalSessions: stats.totalSessions,
    successRate: stats.successRate.toFixed(1) + "%",
    avgTimeToLogin: stats.avgTimeToLogin + "초",
  });

  return stats;
}
