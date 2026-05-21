/**
 * 🔔 QR 로그인 알림 시스템 고도화 (Severity + Root Cause)
 * 
 * 주기적으로 QR 로그인 통계를 집계하고 임계치를 체크하여 Slack 알림 전송
 * 
 * 기능:
 * - 심각도 분기 (Warning / Critical)
 * - 원인 요약 자동 생성 (룰 기반)
 * - 중복 알림 방지 (cooldown)
 * - 플랫폼별 통계 (모바일 vs 데스크톱)
 * 
 * 임계치:
 * - 성공률 < 90% → Warning, < 85% → Critical
 * - SMS 실패율 > 5% → Warning
 * - 평균 로그인 시간 > 60초 → Warning
 * - 세션 만료율 > 10% → Warning
 * - 임계치 2개 이상 초과 → Critical
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import { applyAutoMitigationFlags } from "./qrLoginAutoMitigation";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 피크 시간대 정의
 * 
 * 피크: 12-14시 (점심), 18-22시 (저녁)
 * 오프피크: 그 외 시간대
 */
const PEAK_HOURS = [12, 13, 14, 18, 19, 20, 21];

/**
 * 임계치 설정 (초기 기준선 - 민감하게 설정)
 * 
 * TODO: 24~48시간 데이터 수집 후 튜닝 필요
 * - calculateThresholds() 함수로 기준선 계산
 * - 시간대별 분리 적용
 */
const THRESHOLDS = {
  // 전체 시간대 공통 임계치 (기본값)
  default: {
    successRate: 90, // 90% 미만이면 Critical
    smsFailureRate: 5, // 5% 초과면 Critical
    avgLoginTime: 60, // 60초 초과면 Critical
    expirationRate: 10, // 10% 초과면 Critical
  },
  // 피크 시간대 임계치 (트래픽이 많아 약간 완화)
  peak: {
    successRate: 88, // 피크 시간대는 약간 낮게
    smsFailureRate: 6, // 피크 시간대는 약간 높게
    avgLoginTime: 70, // 피크 시간대는 약간 길게
    expirationRate: 12, // 피크 시간대는 약간 높게
  },
  // 오프피크 시간대 임계치 (트래픽이 적어 더 엄격)
  offPeak: {
    successRate: 95, // 오프피크는 높게
    smsFailureRate: 3, // 오프피크는 낮게
    avgLoginTime: 50, // 오프피크는 짧게
    expirationRate: 8, // 오프피크는 낮게
  },
};

/**
 * 현재 시간대에 맞는 임계치 반환
 */
function getThresholdsForCurrentTime(): typeof THRESHOLDS.default {
  const now = new Date();
  const hour = now.getHours();
  const isPeak = PEAK_HOURS.includes(hour);
  
  return isPeak ? THRESHOLDS.peak : THRESHOLDS.offPeak;
}

/**
 * 알림 스팸 방지 TTL (분)
 */
const ALERT_COOLDOWN_MINUTES = 10; // 10분 내 중복 알림 차단

/**
 * 알림 심각도 정의
 */
export enum AlertSeverity {
  INFO = "info", // 정보 (회복 감지)
  WARNING = "warning", // 경고 (일반 메시지)
  CRITICAL = "critical", // 심각 (멘션 필요)
}

/**
 * 추천 액션 아이템
 */
interface ActionItem {
  action: string; // 액션 내용
  reason: string; // 추천 근거 (지표 값 포함)
  priority: "high" | "medium" | "low"; // 우선순위
}

/**
 * 원인 분석 결과
 */
interface RootCauseAnalysis {
  primaryCause: string; // 주요 원인 (1줄)
  secondaryCauses: string[]; // 부가 원인
  actionItems: ActionItem[]; // 조치 제안 (근거 포함)
}

/**
 * Slack Webhook URL 가져오기
 * 
 * 환경 변수 우선순위:
 * 1. SLACK_QR_ALERT_WEBHOOK_URL (process.env)
 * 2. SLACK_QR_WEBHOOK_URL (process.env)
 * 3. functions.config().monitoring.slack_qr_webhook
 */
function getSlackWebhookUrl(): string | null {
  // 환경 변수에서 가져오기
  const url =
    process.env.SLACK_QR_ALERT_WEBHOOK_URL ||
    process.env.SLACK_QR_WEBHOOK_URL ||
    null;
  
  if (!url) {
    logger.warn("⚠️ [qrLoginAlert] Slack Webhook URL이 설정되지 않음");
    logger.warn("⚠️ [qrLoginAlert] 환경 변수 설정: SLACK_QR_ALERT_WEBHOOK_URL 또는 SLACK_QR_WEBHOOK_URL");
  }
  
  return url || null;
}

/**
 * 최근 N분간 QR 로그인 통계 집계
 */
async function aggregateRecentStats(minutesBack: number): Promise<{
  totalSessions: number;
  successfulLogins: number;
  failedLogins: number;
  expiredSessions: number;
  successRate: number;
  smsFailed: number;
  avgTimeToLogin: number;
  duplicateTokenPrevented: number;
  period: string;
  platformStats: {
    desktop: { sessions: number; successes: number; failures: number };
    mobile: { sessions: number; successes: number; failures: number };
  };
}> {
  const now = Date.now();
  const startTime = now - (minutesBack * 60 * 1000);
  const startTimestamp = Timestamp.fromMillis(startTime);
  const endTimestamp = Timestamp.fromMillis(now);

  logger.info("📊 [qrLoginAlert] 통계 집계 시작:", {
    minutesBack,
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

  // QR 로그인 이벤트만 필터링
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
  let duplicateTokenPrevented = 0;
  const loginTimes: number[] = [];
  const sessionTimestamps: Record<string, { created?: number; success?: number }> = {};
  
  // 플랫폼별 통계
  const platformStats = {
    desktop: { sessions: 0, successes: 0, failures: 0 },
    mobile: { sessions: 0, successes: 0, failures: 0 },
  };

  // 클라이언트 이벤트 처리
  qrEvents.forEach((event: any) => {
    const sessionId = event.sessionId;
    if (!sessionId) return;

    sessions.add(sessionId);

    // 세션 생성 시간 기록
    if (event.event === "qr_login_session_created") {
      sessionTimestamps[sessionId] = {
        created:
          event.createdAt?.toMillis?.() ||
          (event.createdAt?.seconds || 0) * 1000 ||
          Date.now(),
      };
    }

    // 플랫폼 정보 추출
    const platform = event.platform || "unknown";
    const isMobile = platform === "mobile";
    const isDesktop = platform === "desktop";

    // 성공/실패 추적
    if (event.event === "qr_login_success") {
      successfulSessions.add(sessionId);
      
      if (isMobile) platformStats.mobile.successes++;
      else if (isDesktop) platformStats.desktop.successes++;

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
      
      if (isMobile) platformStats.mobile.failures++;
      else if (isDesktop) platformStats.desktop.failures++;

      // 실패 원인 분석
      const errorCode = event.errorCode || "unknown";
      if (errorCode.includes("sms") || errorCode.includes("SMS")) {
        smsFailed++;
      }
    } else if (event.event === "qr_login_session_expired") {
      expiredSessions.add(sessionId);
    }
    
    // 플랫폼별 세션 카운트
    if (event.event === "qr_login_session_created") {
      if (isMobile) platformStats.mobile.sessions++;
      else if (isDesktop) platformStats.desktop.sessions++;
    }
  });

  // 서버 로그 처리
  serverLogs.forEach((log: any) => {
    const sessionId = log.sessionId;
    if (!sessionId) return;

    if (log.eventType === "session_expired") {
      expiredSessions.add(sessionId);
    } else if (log.eventType === "duplicate_token_prevented") {
      duplicateTokenPrevented++;
    } else if (log.eventType === "error" || log.eventType === "token_issue_failed") {
      if (!successfulSessions.has(sessionId) && !failedSessions.has(sessionId)) {
        failedSessions.add(sessionId);
      }
    }
  });

  // 평균 시간 계산
  const avgTimeToLogin =
    loginTimes.length > 0
      ? loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length
      : 0;

  const successRate =
    sessions.size > 0 ? (successfulSessions.size / sessions.size) * 100 : 0;

  return {
    totalSessions: sessions.size,
    successfulLogins: successfulSessions.size,
    failedLogins: failedSessions.size,
    expiredSessions: expiredSessions.size,
    successRate: Math.round(successRate * 10) / 10, // 소수점 1자리
    smsFailed,
    avgTimeToLogin: Math.round(avgTimeToLogin),
    duplicateTokenPrevented,
    period: minutesBack === 5 ? "최근 5분" : minutesBack === 10 ? "최근 10분" : `최근 ${minutesBack}분`,
    platformStats,
  };
}

/**
 * 마지막 알림 시각 확인 (스팸 방지)
 */
async function getLastAlertTime(alertType: string): Promise<number | null> {
  try {
    const alertDoc = await db
      .collection("monitoring")
      .doc("qrLoginLastAlert")
      .get();

    if (!alertDoc.exists) {
      return null;
    }

    const data = alertDoc.data();
    return data?.[alertType] || null;
  } catch (error) {
    logger.warn("⚠️ [qrLoginAlert] 마지막 알림 시각 조회 실패:", error);
    return null;
  }
}

/**
 * 마지막 알림 시각 업데이트
 */
async function updateLastAlertTime(alertType: string): Promise<void> {
  try {
    await db
      .collection("monitoring")
      .doc("qrLoginLastAlert")
      .set(
        {
          [alertType]: Date.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
  } catch (error) {
    logger.warn("⚠️ [qrLoginAlert] 마지막 알림 시각 업데이트 실패:", error);
  }
}

/**
 * 알림 스팸 방지 체크
 */
async function shouldSendAlert(alertType: string): Promise<boolean> {
  const lastAlertTime = await getLastAlertTime(alertType);
  if (!lastAlertTime) {
    return true; // 첫 알림
  }

  const now = Date.now();
  const cooldownMs = ALERT_COOLDOWN_MINUTES * 60 * 1000;
  const timeSinceLastAlert = now - lastAlertTime;

  if (timeSinceLastAlert < cooldownMs) {
    logger.info(`⏭️ [qrLoginAlert] 알림 스팸 방지: ${alertType} (${Math.round(timeSinceLastAlert / 1000 / 60)}분 전 알림)`);
    return false;
  }

  return true;
}

/**
 * 원인 분석 (룰 기반 추론)
 */
function analyzeRootCause(
  stats: Awaited<ReturnType<typeof aggregateRecentStats>>,
  problems: string[],
  thresholds: typeof THRESHOLDS.default
): RootCauseAnalysis {
  const smsFailureRate = stats.totalSessions > 0
    ? (stats.smsFailed / stats.totalSessions) * 100
    : 0;
  const expirationRate = stats.totalSessions > 0
    ? (stats.expiredSessions / stats.totalSessions) * 100
    : 0;
  const loginFailureRate = stats.totalSessions > 0
    ? ((stats.failedLogins - stats.expiredSessions) / stats.totalSessions) * 100
    : 0;

  const mobileTotal = stats.platformStats.mobile.sessions;
  const desktopTotal = stats.platformStats.desktop.sessions;
  const mobileSuccessRate = mobileTotal > 0
    ? (stats.platformStats.mobile.successes / mobileTotal) * 100
    : 0;
  const desktopSuccessRate = desktopTotal > 0
    ? (stats.platformStats.desktop.successes / desktopTotal) * 100
    : 0;

  const primaryCause: string[] = [];
  const secondaryCauses: string[] = [];
  const actionItems: ActionItem[] = [];

  // 룰 1: SMS 실패율 증가 + 로그인 실패율 낮음 → SMS 인증 구간 문제
  if (smsFailureRate > thresholds.smsFailureRate && loginFailureRate < 3) {
    primaryCause.push("SMS 인증 구간 문제 가능성 높음");
    actionItems.push({
      action: "🔧 SMS 인증 UX 점검",
      reason: `SMS 실패율 ${smsFailureRate.toFixed(1)}% (기준: ${thresholds.smsFailureRate}%)`,
      priority: "high",
    });
    actionItems.push({
      action: "📞 통신사 상태 확인",
      reason: `SMS 실패율 ${smsFailureRate.toFixed(1)}%`,
      priority: "high",
    });
  }

  // 룰 2: 평균 로그인 시간 증가 + 만료율 증가 → 사용자 인증 지연
  if (stats.avgTimeToLogin > thresholds.avgLoginTime && expirationRate > thresholds.expirationRate) {
    primaryCause.push("사용자 인증 지연으로 세션 만료 증가");
    actionItems.push({
      action: "⏱️ 로딩/네트워크 구간 점검",
      reason: `평균 로그인 시간 ${stats.avgTimeToLogin}초 (기준: ${thresholds.avgLoginTime}초)`,
      priority: "high",
    });
    actionItems.push({
      action: "⏰ QR 만료 시간 임시 +1분 검토",
      reason: `만료율 ${expirationRate.toFixed(1)}% (기준: ${thresholds.expirationRate}%)`,
      priority: "medium",
    });
  } else if (stats.avgTimeToLogin > thresholds.avgLoginTime) {
    // 로그인 시간만 증가한 경우
    actionItems.push({
      action: "⏱️ 로딩/네트워크 구간 점검",
      reason: `평균 로그인 시간 ${stats.avgTimeToLogin}초 (기준: ${thresholds.avgLoginTime}초)`,
      priority: "medium",
    });
  } else if (expirationRate > thresholds.expirationRate) {
    // 만료율만 증가한 경우
    actionItems.push({
      action: "⏰ QR 만료 시간 임시 +1분 검토",
      reason: `만료율 ${expirationRate.toFixed(1)}% (기준: ${thresholds.expirationRate}%)`,
      priority: "medium",
    });
  }

  // 룰 3: 모바일 성공률 낮음 + 데스크톱 정상 → 모바일 UX/네트워크 이슈
  if (mobileTotal > 0 && desktopTotal > 0) {
    const mobileSuccessDiff = mobileSuccessRate - desktopSuccessRate;
    if (mobileSuccessDiff < -10) {
      primaryCause.push("모바일 UX/네트워크 이슈 가능성");
      secondaryCauses.push(`모바일 성공률: ${mobileSuccessRate.toFixed(1)}% vs 데스크톱: ${desktopSuccessRate.toFixed(1)}%`);
      actionItems.push({
        action: "📱 모바일 입력 UX/키보드/포커스 확인",
        reason: `모바일 성공률 ${mobileSuccessRate.toFixed(1)}% (데스크톱 대비 ${Math.abs(mobileSuccessDiff).toFixed(1)}%p 낮음)`,
        priority: "high",
      });
      actionItems.push({
        action: "📱 모바일 환경 테스트 권장",
        reason: `모바일 실패 비중 ${((mobileTotal - stats.platformStats.mobile.successes) / (mobileTotal + desktopTotal - stats.successfulLogins) * 100).toFixed(1)}%`,
        priority: "medium",
      });
    }
  }

  // 룰 4: 중복 토큰 방지 증가 → QR 노출/공유 이슈
  if (stats.duplicateTokenPrevented > 0) {
    if (stats.duplicateTokenPrevented > 3) {
      primaryCause.push("중복 스캔 시도 급증 (QR 노출/공유 이슈 가능성)");
      actionItems.push({
        action: "🔒 QR 노출/공유 방식 점검",
        reason: `중복 토큰 방지 ${stats.duplicateTokenPrevented}건 발생`,
        priority: "high",
      });
    } else {
      secondaryCauses.push(`중복 토큰 방지 ${stats.duplicateTokenPrevented}건 발생`);
      actionItems.push({
        action: "🔒 QR 노출/공유 패턴 확인",
        reason: `중복 토큰 방지 ${stats.duplicateTokenPrevented}건`,
        priority: "low",
      });
    }
  }

  // 룰 5: 성공률 전반 저하 + 특정 원인 없음 → 시스템 전반 이슈
  if (stats.successRate < thresholds.successRate && primaryCause.length === 0) {
    primaryCause.push("QR 로그인 시스템 전반 성능 저하");
    actionItems.push({
      action: "🔍 시스템 리소스 및 로그 확인",
      reason: `성공률 ${stats.successRate.toFixed(1)}% (기준: ${thresholds.successRate}%)`,
      priority: "high",
    });
    actionItems.push({
      action: "☁️ Firebase 서비스 상태 확인",
      reason: `성공률 ${stats.successRate.toFixed(1)}%`,
      priority: "medium",
    });
  }

  // 룰 6: 피크 시간대 + 트래픽 증가 → 트래픽 영향
  const now = new Date();
  const hour = now.getHours();
  const isPeak = PEAK_HOURS.includes(hour);
  if (isPeak && stats.totalSessions > 50) {
    secondaryCauses.push("피크 시간대 트래픽 증가 영향");
    if (stats.successRate < thresholds.successRate) {
      actionItems.push({
        action: "📊 트래픽 모니터링 강화",
        reason: `피크 시간대 세션 ${stats.totalSessions}건`,
        priority: "low",
      });
    }
  }

  // 액션 아이템이 없으면 기본 액션 추가
  if (actionItems.length === 0) {
    actionItems.push({
      action: "✅ 즉시 조치 필요 없음 (모니터링 유지)",
      reason: "모든 지표 정상 범위 내",
      priority: "low",
    });
  }

  // 우선순위별 정렬 (high → medium → low)
  actionItems.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    primaryCause: primaryCause.length > 0
      ? primaryCause.join(" / ")
      : "원인 분석 중 (추가 데이터 필요)",
    secondaryCauses,
    actionItems,
  };
}

/**
 * 심각도 판단
 * 
 * - Warning: 임계치 1개 초과
 * - Critical: 임계치 2개 이상 초과 또는 성공률 < 85%
 */
function determineSeverity(
  problems: string[],
  stats: Awaited<ReturnType<typeof aggregateRecentStats>>,
  thresholds: typeof THRESHOLDS.default
): AlertSeverity {
  const problemCount = problems.length;
  
  // Critical 조건
  if (stats.successRate < 85) {
    return AlertSeverity.CRITICAL;
  }
  
  if (problemCount >= 2) {
    return AlertSeverity.CRITICAL;
  }
  
  // Warning 조건
  if (problemCount >= 1) {
    return AlertSeverity.WARNING;
  }
  
  return AlertSeverity.INFO;
}

/**
 * Slack 알림 전송 (고도화된 포맷)
 * 
 * @param severity 알림 심각도 (Warning: 일반 메시지, Critical: 멘션)
 * @param appliedFlags 자동 완화 플래그 목록 (Critical일 때만)
 */
async function sendSlackAlert(
  stats: Awaited<ReturnType<typeof aggregateRecentStats>>,
  alertType: string,
  problems: string[],
  severity: AlertSeverity,
  rootCause: RootCauseAnalysis,
  appliedFlags: string[] = []
): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    logger.warn("⚠️ [qrLoginAlert] Slack Webhook URL이 설정되지 않음");
    return false;
  }

  const smsFailureRate = stats.totalSessions > 0
    ? (stats.smsFailed / stats.totalSessions) * 100
    : 0;
  const expirationRate = stats.totalSessions > 0
    ? (stats.expiredSessions / stats.totalSessions) * 100
    : 0;

  // 심각도에 따른 이모지 및 멘션
  const emoji = severity === AlertSeverity.CRITICAL ? "🚨" : severity === AlertSeverity.WARNING ? "⚠️" : "🟢";
  const mention = severity === AlertSeverity.CRITICAL ? "@here " : "";
  const severityLabel = severity === AlertSeverity.CRITICAL ? "장애" : severity === AlertSeverity.WARNING ? "이상" : "정보";
  
  // 고도화된 메시지 포맷
  const statusIcon = (value: number, threshold: number, isLowerBetter: boolean = false) => {
    if (isLowerBetter) {
      return value < threshold ? "✅" : "❌";
    }
    return value > threshold ? "❌" : "✅";
  };

  const thresholds = getThresholdsForCurrentTime();
  
  let message = `
${emoji} ${mention}*QR 로그인 ${severityLabel} 감지* (${severity.toUpperCase()})

기간: ${stats.period}
전체 세션: ${stats.totalSessions}건

지표:
- 성공률: ${stats.successRate.toFixed(1)}% ${statusIcon(stats.successRate, thresholds.successRate, true)}
- SMS 실패율: ${smsFailureRate.toFixed(1)}% ${statusIcon(smsFailureRate, thresholds.smsFailureRate)}
- 평균 로그인 시간: ${stats.avgTimeToLogin}초 ${statusIcon(stats.avgTimeToLogin, thresholds.avgLoginTime)}
- 세션 만료율: ${expirationRate.toFixed(1)}% ${statusIcon(expirationRate, thresholds.expirationRate)}
${stats.duplicateTokenPrevented > 0 ? `- 중복 토큰 방지: ${stats.duplicateTokenPrevented}건` : ""}
`.trim();

  // 플랫폼별 통계 추가 (모바일/데스크톱 차이가 있을 때만)
  const mobileTotal = stats.platformStats.mobile.sessions;
  const desktopTotal = stats.platformStats.desktop.sessions;
  if (mobileTotal > 0 || desktopTotal > 0) {
    const mobileRate = mobileTotal > 0
      ? (stats.platformStats.mobile.successes / mobileTotal) * 100
      : 0;
    const desktopRate = desktopTotal > 0
      ? (stats.platformStats.desktop.successes / desktopTotal) * 100
      : 0;
    
    if (Math.abs(mobileRate - desktopRate) > 5) {
      message += `\n\n플랫폼별:\n- 모바일: ${mobileRate.toFixed(1)}% (${mobileTotal}건)\n- 데스크톱: ${desktopRate.toFixed(1)}% (${desktopTotal}건)`;
    }
  }

  // 문제 목록
  if (problems.length > 0) {
    message += `\n\n문제:\n${problems.map(p => `- ${p}`).join("\n")}`;
  }

  // 원인 분석
  message += `\n\n🧠 추정 원인:\n${rootCause.primaryCause}`;
  if (rootCause.secondaryCauses.length > 0) {
    message += `\n${rootCause.secondaryCauses.map(c => `- ${c}`).join("\n")}`;
  }

  // 추천 액션 (근거 포함)
  if (rootCause.actionItems.length > 0) {
    message += `\n\n🛠 추천 액션:`;
    rootCause.actionItems.forEach((item, index) => {
      const priorityIcon = item.priority === "high" ? "🔴" : item.priority === "medium" ? "🟡" : "🟢";
      message += `\n${index + 1}. ${item.action} ${priorityIcon}`;
      message += `\n   └ ${item.reason}`;
    });
  }

    // 상태 메시지 추가
    const statusMessage = severity === AlertSeverity.CRITICAL
      ? "즉시 조치 필요"
      : severity === AlertSeverity.WARNING
      ? "주의 관찰"
      : "정상 범위";
    message += `\n\n👉 상태: ${statusMessage}`;

    // 자동 완화 조치 표시 (Critical일 때만)
    if (appliedFlags.length > 0) {
      message += `\n\n⚙️ 자동 완화 조치 (30분 TTL):`;
      appliedFlags.forEach((flag) => {
        let flagLabel = "";
        if (flag === "smsUXVariant=v2") {
          flagLabel = "SMS UX Variant v2";
        } else if (flag === "extendedExpireSec=+60s") {
          flagLabel = "QR 만료 시간 +60초";
        } else if (flag === "mobileUXBoost=true") {
          flagLabel = "모바일 UX Boost ON";
        } else {
          flagLabel = flag;
        }
        message += `\n- ${flagLabel}`;
      });
    }

  const payload = {
    text: message,
  };

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    logger.info(`✅ [qrLoginAlert] Slack 알림 전송 성공: ${alertType}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [qrLoginAlert] Slack 알림 전송 실패: ${alertType}`, {
      error: error.message,
    });
    return false;
  }
}

/**
 * 임계치 체크 및 알림
 */
async function checkThresholdsAndAlert(minutesBack: number): Promise<void> {
  logger.info(`🔔 [qrLoginAlert] 건강 상태 체크 시작 (${minutesBack}분)`);

  try {
    // 통계 집계
    const stats = await aggregateRecentStats(minutesBack);

    if (stats.totalSessions === 0) {
      logger.info("✅ [qrLoginAlert] 세션이 없어 체크 스킵");
      return;
    }

    // 현재 시간대에 맞는 임계치 가져오기
    const thresholds = getThresholdsForCurrentTime();
    
    // 임계치 체크 및 문제 목록 수집
    const problems: string[] = [];
    const alertTypes: string[] = [];

    // 1. 성공률 체크
    if (stats.successRate < thresholds.successRate) {
      problems.push(
        `성공률 ${stats.successRate.toFixed(1)}% (< ${thresholds.successRate}%)`
      );
      alertTypes.push("success_rate");
    }

    // 2. SMS 실패율 체크
    const smsFailureRate = stats.totalSessions > 0
      ? (stats.smsFailed / stats.totalSessions) * 100
      : 0;
    if (smsFailureRate > thresholds.smsFailureRate) {
      problems.push(
        `SMS 실패율 ${smsFailureRate.toFixed(1)}% (> ${thresholds.smsFailureRate}%)`
      );
      alertTypes.push("sms_failure_rate");
    }

    // 3. 평균 로그인 시간 체크
    if (stats.avgTimeToLogin > thresholds.avgLoginTime) {
      problems.push(
        `평균 로그인 시간 ${stats.avgTimeToLogin}초 (> ${thresholds.avgLoginTime}초)`
      );
      alertTypes.push("avg_login_time");
    }

    // 4. 세션 만료율 체크
    const expirationRate = stats.totalSessions > 0
      ? (stats.expiredSessions / stats.totalSessions) * 100
      : 0;
    if (expirationRate > thresholds.expirationRate) {
      problems.push(
        `세션 만료율 ${expirationRate.toFixed(1)}% (> ${thresholds.expirationRate}%)`
      );
      alertTypes.push("expiration_rate");
    }

    // 5. duplicate_token_prevented 증가 감지
    if (stats.duplicateTokenPrevented > 0) {
      problems.push(
        `중복 토큰 방지 ${stats.duplicateTokenPrevented}건 발생 (비정상 패턴 가능성)`
      );
      alertTypes.push("duplicate_token_prevented");
    }

    // 문제가 없으면 종료
    if (problems.length === 0) {
      logger.info("✅ [qrLoginAlert] 모든 지표 정상 범위 내");
      return;
    }

    // 심각도 판단
    const severity = determineSeverity(problems, stats, thresholds);
    
    // 원인 분석
    const rootCause = analyzeRootCause(stats, problems, thresholds);

    // 중복 알림 방지 체크 (첫 번째 문제 타입 기준)
    const primaryAlertType = alertTypes[0];
    if (!(await shouldSendAlert(primaryAlertType))) {
      logger.info("⏭️ [qrLoginAlert] 중복 알림 방지로 스킵");
      return;
    }

    // 자동 완화 플래그 적용 (Critical 레벨에서만)
    let appliedFlags: string[] = [];
    if (severity === AlertSeverity.CRITICAL) {
      try {
        const smsFailureRate = stats.totalSessions > 0
          ? (stats.smsFailed / stats.totalSessions) * 100
          : 0;
        const expirationRate = stats.totalSessions > 0
          ? (stats.expiredSessions / stats.totalSessions) * 100
          : 0;
        const mobileFail = stats.platformStats.mobile.failures;
        const desktopFail = stats.platformStats.desktop.failures;

        appliedFlags = await applyAutoMitigationFlags({
          smsFailRate: smsFailureRate,
          expiredRate: expirationRate,
          mobileFail,
          desktopFail,
          level: "critical",
          alertReason: `${rootCause.primaryCause} (${stats.period})`,
        });

        if (appliedFlags.length > 0) {
          logger.info("⚙️ [qrLoginAlert] 자동 완화 플래그 적용:", appliedFlags);
        }
      } catch (error: any) {
        logger.error("❌ [qrLoginAlert] 자동 완화 플래그 적용 실패:", {
          error: error.message,
        });
        // 플래그 적용 실패해도 알림은 전송
      }
    }

    // Slack 알림 전송 (심각도 + 원인 분석 + 자동 완화 포함)
    await sendSlackAlert(stats, primaryAlertType, problems, severity, rootCause, appliedFlags);
    
    // 마지막 알림 시각 업데이트 (모든 알림 타입에 대해)
    for (const alertType of alertTypes) {
      await updateLastAlertTime(alertType);
    }

    logger.info("✅ [qrLoginAlert] 건강 상태 체크 완료");
  } catch (error: any) {
    logger.error("❌ [qrLoginAlert] 건강 상태 체크 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 5분 주기 체크 (빠른 대응용)
 */
export const qrLoginAlert5min = onSchedule(
  {
    schedule: "*/5 * * * *", // 5분마다
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    await checkThresholdsAndAlert(5);
  }
);

/**
 * 10분 주기 체크 (종합 리포트용)
 */
export const qrLoginAlert10min = onSchedule(
  {
    schedule: "*/10 * * * *", // 10분마다
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    await checkThresholdsAndAlert(10);
  }
);
