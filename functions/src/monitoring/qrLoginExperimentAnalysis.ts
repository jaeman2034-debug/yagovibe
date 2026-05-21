/**
 * 🧪 QR 로그인 자동 완화 실험 분석
 * 
 * 자동 완화 플래그가 실제로 효과가 있었는지 Before/After 비교 분석
 * 
 * 실험 구조:
 * - Before: 플래그 OFF 상태 (플래그 적용 전 30분)
 * - After: 플래그 ON 상태 (플래그 적용 후 30분)
 * - 판정: 통계적 개선 여부
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 실험 메타데이터 구조
 */
export interface QRLoginExperiment {
  flag: "smsUXVariant_v2" | "extendedExpire" | "mobileUXBoost";
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  ttlMinutes: number;
  triggerReason: string; // 어떤 알림에서 시작됐는지
  status: "running" | "completed" | "invalid";
}

/**
 * 실험 결과 구조
 */
export interface QRLoginExperimentResult {
  experimentId: string;
  flag: string;
  before: {
    successRate: number;
    smsFailRate: number;
    avgDuration: number;
    expiredRate: number;
    sampleSize: number;
  };
  after: {
    successRate: number;
    smsFailRate: number;
    avgDuration: number;
    expiredRate: number;
    sampleSize: number;
  };
  delta: {
    successRate: number; // After - Before
    smsFailRate: number;
    avgDuration: number;
    expiredRate: number;
  };
  verdict: "positive" | "neutral" | "negative";
  confidence: number; // 0~1 (샘플 크기 기반)
  analyzedAt: Timestamp;
}

/**
 * 특정 시간 범위의 통계 집계
 */
async function aggregateStatsForPeriod(
  startTimestamp: Timestamp,
  endTimestamp: Timestamp
): Promise<{
  successRate: number;
  smsFailRate: number;
  avgDuration: number;
  expiredRate: number;
  sampleSize: number;
}> {
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
  const sessionTimestamps: Record<string, { created?: number; success?: number }> = {};

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

    // 성공/실패 추적
    if (event.event === "qr_login_success") {
      successfulSessions.add(sessionId);

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

      // 실패 원인 분석
      const errorCode = event.errorCode || "unknown";
      if (errorCode.includes("sms") || errorCode.includes("SMS")) {
        smsFailed++;
      }
    } else if (event.event === "qr_login_session_expired") {
      expiredSessions.add(sessionId);
    }
  });

  // 서버 로그 처리
  serverLogs.forEach((log: any) => {
    const sessionId = log.sessionId;
    if (!sessionId) return;

    if (log.eventType === "session_expired") {
      expiredSessions.add(sessionId);
    } else if (log.eventType === "error" || log.eventType === "token_issue_failed") {
      if (!successfulSessions.has(sessionId) && !failedSessions.has(sessionId)) {
        failedSessions.add(sessionId);
      }
    }
  });

  // 통계 계산
  const totalSessions = sessions.size || 1;
  const successRate = (successfulSessions.size / totalSessions) * 100;
  const smsFailRate = (smsFailed / totalSessions) * 100;
  const expiredRate = (expiredSessions.size / totalSessions) * 100;
  const avgDuration =
    loginTimes.length > 0
      ? loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length
      : 0;

  return {
    successRate: Math.round(successRate * 10) / 10,
    smsFailRate: Math.round(smsFailRate * 10) / 10,
    avgDuration: Math.round(avgDuration),
    expiredRate: Math.round(expiredRate * 10) / 10,
    sampleSize: totalSessions,
  };
}

/**
 * 실험 생성 (자동 완화 플래그 적용 시)
 */
export async function createExperiment(
  flag: QRLoginExperiment["flag"],
  ttlMinutes: number,
  triggerReason: string
): Promise<string> {
  const experimentRef = db.collection("experiments").doc();
  const experimentId = experimentRef.id;

  await experimentRef.set({
    flag,
    startedAt: Timestamp.now(),
    endedAt: null,
    ttlMinutes,
    triggerReason,
    status: "running",
  });

  logger.info("🧪 [qrLoginExperimentAnalysis] 실험 생성:", {
    experimentId,
    flag,
    ttlMinutes,
    triggerReason,
  });

  return experimentId;
}

/**
 * 실험 분석 (TTL 만료 후)
 */
export async function analyzeExperiment(experimentId: string): Promise<QRLoginExperimentResult | null> {
  try {
    const experimentRef = db.collection("experiments").doc(experimentId);
    const experimentSnap = await experimentRef.get();

    if (!experimentSnap.exists) {
      logger.warn("⚠️ [qrLoginExperimentAnalysis] 실험 문서 없음:", experimentId);
      return null;
    }

    const experiment = experimentSnap.data() as QRLoginExperiment;

    if (experiment.status !== "running") {
      logger.info("⏭️ [qrLoginExperimentAnalysis] 이미 분석된 실험:", experimentId);
      return null;
    }

    const started = experiment.startedAt.toMillis();
    const ttlMs = experiment.ttlMinutes * 60 * 1000;
    const ended = started + ttlMs;

    // 아직 TTL이 안 지났으면 스킵
    if (Date.now() < ended) {
      return null;
    }

    logger.info("🧪 [qrLoginExperimentAnalysis] 실험 분석 시작:", {
      experimentId,
      flag: experiment.flag,
      startedAt: experiment.startedAt.toDate().toISOString(),
    });

    // Before/After 구간 정의
    const beforeFrom = Timestamp.fromMillis(started - ttlMs); // 플래그 적용 전 30분
    const beforeTo = experiment.startedAt; // 플래그 적용 시점
    const afterFrom = experiment.startedAt; // 플래그 적용 시점
    const afterTo = Timestamp.fromMillis(ended); // 플래그 만료 시점

    // 통계 집계
    const beforeStats = await aggregateStatsForPeriod(beforeFrom, beforeTo);
    const afterStats = await aggregateStatsForPeriod(afterFrom, afterTo);

    // Delta 계산
    const delta = {
      successRate: afterStats.successRate - beforeStats.successRate,
      smsFailRate: afterStats.smsFailRate - beforeStats.smsFailRate,
      avgDuration: afterStats.avgDuration - beforeStats.avgDuration,
      expiredRate: afterStats.expiredRate - beforeStats.expiredRate,
    };

    // 판정 로직
    let verdict: "positive" | "neutral" | "negative" = "neutral";
    
    // Positive 조건: 성공률 +3% 이상, 또는 SMS 실패율 -2% 이상, 또는 만료율 -2% 이상
    if (
      delta.successRate > 3 ||
      delta.smsFailRate < -2 ||
      delta.expiredRate < -2
    ) {
      verdict = "positive";
    }
    // Negative 조건: 성공률 -3% 이상
    else if (delta.successRate < -3) {
      verdict = "negative";
    }

    // 신뢰도 계산 (샘플 크기 기반)
    const minSampleSize = Math.min(beforeStats.sampleSize, afterStats.sampleSize);
    const confidence = Math.min(1, minSampleSize / 100); // 100개 이상이면 confidence 1.0

    const result: QRLoginExperimentResult = {
      experimentId,
      flag: experiment.flag,
      before: beforeStats,
      after: afterStats,
      delta,
      verdict,
      confidence: Math.round(confidence * 100) / 100,
      analyzedAt: Timestamp.now(),
    };

    // 실험 결과 저장
    await db.collection("experimentResults").doc(experimentId).set(result);

    // 실험 상태 업데이트
    await experimentRef.update({
      status: "completed",
      endedAt: Timestamp.now(),
    });

    logger.info("✅ [qrLoginExperimentAnalysis] 실험 분석 완료:", {
      experimentId,
      verdict,
      confidence,
      delta: {
        successRate: delta.successRate.toFixed(1) + "%",
        smsFailRate: delta.smsFailRate.toFixed(1) + "%",
        expiredRate: delta.expiredRate.toFixed(1) + "%",
      },
    });

    return result;
  } catch (error: any) {
    logger.error("❌ [qrLoginExperimentAnalysis] 실험 분석 실패:", {
      experimentId,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * 모든 실행 중인 실험 분석 (스케줄 함수용)
 */
export async function analyzeAllRunningExperiments(): Promise<QRLoginExperimentResult[]> {
  const experimentsRef = db.collection("experiments");
  const runningQuery = experimentsRef.where("status", "==", "running");

  const runningSnap = await runningQuery.get();
  const results: QRLoginExperimentResult[] = [];

  for (const doc of runningSnap.docs) {
    const result = await analyzeExperiment(doc.id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
