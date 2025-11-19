import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { sendSlackAlert } from "./slackAlertHandler";
import { logWorkflowEvent } from "./logWorkflowEvent";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// SLO 설정 (Service Level Objective)
const SLO_ERROR_RATE = 0.01; // 1% 이하 (99% 성공률)
const SLO_CHECK_WINDOW_DAYS = 7; // 최근 7일 기준

/**
 * 릴리즈 체크 로직: SLO 준수율 및 에러 버짓 계산
 */
async function releaseCheckLogic(): Promise<{
  ok: boolean;
  data?: any;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    logger.info("🔍 정식 릴리즈 체크 시작");

    // 최근 7일 workflowLogs 수집
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - SLO_CHECK_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const logsSnap = await db
      .collection("workflowLogs")
      .where("timestamp", ">=", sevenDaysAgo)
      .get();

    const total = logsSnap.size;
    const errors = logsSnap.docs.filter((d) => d.data().status === "error").length;
    const success = logsSnap.docs.filter((d) => d.data().status === "success").length;

    const errorRate = total > 0 ? (errors / total) * 100 : 0;
    const successRate = total > 0 ? (success / total) * 100 : 0;

    // SLO 충족 여부 확인 (에러율 1% 이하)
    const sloMet = errorRate <= SLO_ERROR_RATE * 100;

    // 에러 버짓 계산
    const errorBudget = Math.max(0, SLO_ERROR_RATE * 100 - errorRate); // 남은 버짓 (음수 방지)
    const errorBudgetUsed = Math.min(100, (errorRate / (SLO_ERROR_RATE * 100)) * 100); // 사용된 버짓 비율 (100% 초과 방지)

    // 평균 실행 시간 계산
    const avgDuration =
      logsSnap.docs.reduce((sum, d) => sum + (d.data().durationMs || 0), 0) / (total || 1);

    // 최근 오류 분석 (상위 5개)
    const recentErrors = logsSnap.docs
      .filter((d) => d.data().status === "error")
      .map((d) => ({
        step: d.data().step || "unknown",
        errorMessage: d.data().errorMessage || "No error message",
        timestamp: d.data().timestamp || d.data().createdAt,
      }))
      .sort((a, b) => {
        const aTime = a.timestamp?.toDate?.()?.getTime() || a.timestamp?.seconds * 1000 || 0;
        const bTime = b.timestamp?.toDate?.()?.getTime() || b.timestamp?.seconds * 1000 || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const checkData = {
      total,
      success,
      errors,
      errorRate: errorRate.toFixed(2),
      successRate: successRate.toFixed(2),
      sloMet,
      errorBudget: errorBudget.toFixed(2),
      errorBudgetUsed: errorBudgetUsed.toFixed(2),
      avgDuration: Math.round(avgDuration),
      recentErrors: recentErrors.map((e) => ({
        step: e.step,
        errorMessage: e.errorMessage,
      })),
      checkedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      windowDays: SLO_CHECK_WINDOW_DAYS,
      sloTarget: SLO_ERROR_RATE * 100,
    };

    // Firestore에 저장
    await db.collection("releaseChecks").doc("latest").set(checkData);

    logger.info("✅ 릴리즈 체크 완료:", {
      total,
      errors,
      errorRate: `${errorRate.toFixed(2)}%`,
      sloMet,
    });

    // Slack 알림 (SLO 미충족 시)
    if (!sloMet) {
      await sendSlackAlert(
        `⚠️ *SLO 미충족 경고*\n\n📊 최근 ${SLO_CHECK_WINDOW_DAYS}일 통계:\n• 총 실행: ${total}회\n• 오류: ${errors}회\n• 오류율: ${errorRate.toFixed(2)}% (목표: ${SLO_ERROR_RATE * 100}% 이하)\n• 에러 버짓 사용률: ${errorBudgetUsed.toFixed(2)}%\n\n🚨 SLO 목표를 초과했습니다. 즉시 조치가 필요합니다.`,
        "warning"
      );
    }

    const duration = Date.now() - startTime;
    await logWorkflowEvent("releaseCheck", "success", duration);

    return { ok: true, data: checkData };
  } catch (error: any) {
    logger.error("❌ 릴리즈 체크 오류:", error);
    const duration = Date.now() - startTime;
    await logWorkflowEvent("releaseCheck", "error", duration, error.message);
    await sendSlackAlert(`🚨 [releaseCheck] 체크 오류: ${error.message}`);
    return { ok: false, error: error.message || "Unknown error" };
  }
}

/**
 * 스케줄러 함수: 매주 월요일 10:00 KST 자동 실행
 */
export const releaseCheckJob = onSchedule(
  {
    schedule: "0 10 * * 1", // 매주 월요일 10:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 120,
  },
  async (event) => {
    try {
      logger.info("🕘 정식 릴리즈 체크 자동 실행 시작", { scheduleTime: event.scheduleTime });
      const result = await releaseCheckLogic();
      if (result.ok) {
        logger.info("✅ 정식 릴리즈 체크 자동 실행 완료");
      } else {
        logger.error("❌ 정식 릴리즈 체크 자동 실행 실패", { error: result.error });
      }
    } catch (error: any) {
      logger.error("❌ 정식 릴리즈 체크 자동 실행 오류:", error);
    }
  }
);

/**
 * HTTP 함수: 수동으로 릴리즈 체크 실행
 */
export const releaseCheck = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 3,
    timeoutSeconds: 120,
  },
  async (req, res) => {
    const startTime = Date.now();
    try {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const result = await releaseCheckLogic();

      if (result.ok) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      logger.error("❌ 릴리즈 체크 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("releaseCheck", "error", duration, error.message);
      await sendSlackAlert(`🚨 [releaseCheck HTTP] 오류 발생: ${error.message}`);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

