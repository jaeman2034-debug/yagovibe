/**
 * 📊 QR 로그인 통계 유틸리티
 * 
 * Firestore 쿼리 기반 통계 계산
 * - 성공률
 * - 평균 소요 시간
 * - 실패 원인 분석
 * - 플랫폼별 비교
 */

import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface QRLoginStats {
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
  
  // 기간별 통계 (최근 7일, 30일)
  recentStats: {
    last7Days: {
      sessions: number;
      successes: number;
      successRate: number;
    };
    last30Days: {
      sessions: number;
      successes: number;
      successRate: number;
    };
  };
}

/**
 * QR 로그인 통계 계산
 * @param daysBack 통계 기간 (일) - 기본 30일
 */
export async function getQRLoginStats(daysBack: number = 30): Promise<QRLoginStats> {
  const now = Date.now();
  const startTime = now - (daysBack * 24 * 60 * 60 * 1000);
  const startTimestamp = Timestamp.fromMillis(startTime);

  // 1. eventLogs에서 QR 로그인 이벤트 조회
  const eventLogsRef = collection(db, "eventLogs");
  const qrEventsQuery = query(
    eventLogsRef,
    where("event", ">=", "qr_login_"),
    where("event", "<", "qr_login_z"), // qr_login_으로 시작하는 모든 이벤트
    where("createdAt", ">=", startTimestamp),
    orderBy("createdAt", "desc")
  );

  const eventDocs = await getDocs(qrEventsQuery);
  // 클라이언트에서 QR 로그인 이벤트만 필터링
  const events = eventDocs.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((event: any) => event.event && event.event.startsWith("qr_login_"));

  // 2. qrLoginLogs에서 서버 로그 조회
  const qrLoginLogsRef = collection(db, "qrLoginLogs");
  const serverLogsQuery = query(
    qrLoginLogsRef,
    where("timestamp", ">=", startTimestamp),
    orderBy("timestamp", "desc")
  );

  const serverLogDocs = await getDocs(serverLogsQuery);
  const serverLogs = serverLogDocs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 3. 통계 계산
  const sessions = new Set<string>();
  const successfulSessions = new Set<string>();
  const failedSessions = new Set<string>();
  const expiredSessions = new Set<string>();
  const failureReasons: QRLoginStats["failureReasons"] = {
    smsFailed: 0,
    loginFailed: 0,
    sessionExpired: 0,
    other: 0,
  };
  const platformStats: QRLoginStats["platformStats"] = {
    desktop: { sessions: 0, successes: 0, failures: 0 },
    mobile: { sessions: 0, successes: 0, failures: 0 },
  };
  const loginTimes: number[] = []; // 로그인 소요 시간 배열

  // 이벤트별 처리
  const sessionTimestamps: Record<string, { created?: number; success?: number }> = {};

  events.forEach((event: any) => {
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
        created: event.createdAt?.toMillis?.() || event.createdAt?.seconds * 1000 || Date.now(),
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
        const successTime = event.createdAt?.toMillis?.() || event.createdAt?.seconds * 1000 || Date.now();
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

  // 최근 통계 (7일, 30일)
  const last7DaysStart = now - (7 * 24 * 60 * 60 * 1000);
  const last30DaysStart = now - (30 * 24 * 60 * 60 * 1000);
  const last7DaysTimestamp = Timestamp.fromMillis(last7DaysStart);
  const last30DaysTimestamp = Timestamp.fromMillis(last30DaysStart);

  const recent7DaysEvents = events.filter((e: any) => {
    const eventTime = e.createdAt?.toMillis?.() || e.createdAt?.seconds * 1000 || 0;
    return eventTime >= last7DaysStart;
  });
  const recent30DaysEvents = events.filter((e: any) => {
    const eventTime = e.createdAt?.toMillis?.() || e.createdAt?.seconds * 1000 || 0;
    return eventTime >= last30DaysStart;
  });

  const last7DaysSessions = new Set(recent7DaysEvents.map((e: any) => e.sessionId).filter(Boolean));
  const last7DaysSuccesses = recent7DaysEvents.filter((e: any) => e.event === "qr_login_success").length;
  
  const last30DaysSessions = new Set(recent30DaysEvents.map((e: any) => e.sessionId).filter(Boolean));
  const last30DaysSuccesses = recent30DaysEvents.filter((e: any) => e.event === "qr_login_success").length;

  // 평균 시간 계산
  const avgTimeToLogin = loginTimes.length > 0
    ? loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length
    : 0;
  const minTimeToLogin = loginTimes.length > 0 ? Math.min(...loginTimes) : 0;
  const maxTimeToLogin = loginTimes.length > 0 ? Math.max(...loginTimes) : 0;

  return {
    totalSessions: sessions.size,
    successfulLogins: successfulSessions.size,
    failedLogins: failedSessions.size,
    expiredSessions: expiredSessions.size,
    successRate: sessions.size > 0
      ? (successfulSessions.size / sessions.size) * 100
      : 0,
    avgTimeToLogin: Math.round(avgTimeToLogin),
    minTimeToLogin: Math.round(minTimeToLogin),
    maxTimeToLogin: Math.round(maxTimeToLogin),
    failureReasons,
    platformStats,
    recentStats: {
      last7Days: {
        sessions: last7DaysSessions.size,
        successes: last7DaysSuccesses,
        successRate: last7DaysSessions.size > 0
          ? (last7DaysSuccesses / last7DaysSessions.size) * 100
          : 0,
      },
      last30Days: {
        sessions: last30DaysSessions.size,
        successes: last30DaysSuccesses,
        successRate: last30DaysSessions.size > 0
          ? (last30DaysSuccesses / last30DaysSessions.size) * 100
          : 0,
      },
    },
  };
}

/**
 * 실시간 QR 로그인 이벤트 구독 (대시보드용)
 */
export function subscribeToQREvents(
  onEvent: (event: any) => void,
  daysBack: number = 1
): () => void {
  const now = Date.now();
  const startTime = now - (daysBack * 24 * 60 * 60 * 1000);
  const startTimestamp = Timestamp.fromMillis(startTime);

  const eventLogsRef = collection(db, "eventLogs");
  const qrEventsQuery = query(
    eventLogsRef,
    where("event", ">=", "qr_login_"),
    where("event", "<", "qr_login_z"),
    where("createdAt", ">=", startTimestamp),
    orderBy("createdAt", "desc"),
    limit(50) // 최근 50개만
  );

  // 실시간 구독은 onSnapshot 사용
  const { onSnapshot } = require("firebase/firestore");
  const unsubscribe = onSnapshot(
    qrEventsQuery,
    (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === "added") {
          onEvent({
            id: change.doc.id,
            ...change.doc.data(),
          });
        }
      });
    },
    (error: any) => {
      console.error("📊 [qrLoginStats] 이벤트 구독 오류:", error);
    }
  );

  return unsubscribe;
}
