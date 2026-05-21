import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import { sendSlackAlert } from "./slackAlertHandler";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 28: 주간 워크플로우 통계 생성 및 Slack 알림
 * 매주 월요일 08:00 KST에 실행되어 지난 주 workflowLogs 데이터를 분석
 */
export const generateWorkflowSummary = onSchedule(
  {
    schedule: "0 8 * * 1", // 매주 월요일 08:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 120,
  },
  async (event) => {
    const startTime = Date.now();
    try {
      logger.info("📊 주간 워크플로우 통계 생성 시작", { scheduleTime: event.scheduleTime });

      // 지난 1주간 데이터 수집
      const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const logsSnap = await db
        .collection("workflowLogs")
        .where("timestamp", ">=", oneWeekAgo)
        .get();

      const total = logsSnap.size;
      const success = logsSnap.docs.filter((d) => d.data().status === "success").length;
      const error = logsSnap.docs.filter((d) => d.data().status === "error").length;

      const avgDuration =
        logsSnap.docs.reduce((sum, d) => sum + (d.data().durationMs || 0), 0) / (total || 1);

      const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "0.0";

      // 주요 오류 추출 (상위 3개)
      const errorLogs = logsSnap.docs
        .filter((d) => d.data().status === "error")
        .map((d) => ({
          step: d.data().step || "unknown",
          errorMessage: d.data().errorMessage || "No error message",
          timestamp: d.data().timestamp || d.data().createdAt,
        }))
        .sort((a, b) => {
          // 최신 오류 우선
          const aTime = a.timestamp?.toDate?.()?.getTime() || a.timestamp?.seconds * 1000 || 0;
          const bTime = b.timestamp?.toDate?.()?.getTime() || b.timestamp?.seconds * 1000 || 0;
          return bTime - aTime;
        })
        .slice(0, 3);

      const topErrors = errorLogs.map((e) => `[${e.step}] ${e.errorMessage}`).filter(Boolean);

      // 주간 통계 객체
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStr = weekStart.toISOString().slice(0, 10);

      const summary = {
        week: weekStr,
        total,
        success,
        error,
        successRate,
        avgDuration: Math.round(avgDuration),
        topErrors: topErrors.length > 0 ? topErrors : [],
        generatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };

      // Firestore에 저장
      await db.collection("workflowStats").doc("weekly").set(summary);

      logger.info("✅ 주간 헬스보드 통계 업데이트 완료:", summary);

      // Slack 알림 전송
      const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

      if (webhookUrl) {
        const emoji = parseFloat(successRate) >= 95 ? "🟢" : parseFloat(successRate) >= 80 ? "🟡" : "🔴";
        
        const message = `📊 *YAGO SPORTS — AI 리포트 워크플로우 주간 리포트*\n\n${emoji} *주간 통계 (${weekStr} ~ ${new Date().toISOString().slice(0, 10)})*\n\n🔄 총 실행: *${total}*회\n✅ 성공: *${success}*회\n❌ 오류: *${error}*회\n📈 성공률: *${successRate}%*\n⏱ 평균 처리시간: *${Math.round(avgDuration)}ms*\n\n${topErrors.length > 0 ? `🚨 *주요 오류 (최근 3건):*\n${topErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}` : "✅ 이번 주 오류 없음"}`;

        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: message,
              attachments: [
                {
                  color: parseFloat(successRate) >= 95 ? "#36a64f" : parseFloat(successRate) >= 80 ? "#ffa500" : "#ff0000",
                  fields: [
                    {
                      title: "총 실행",
                      value: `${total}회`,
                      short: true,
                    },
                    {
                      title: "성공률",
                      value: `${successRate}%`,
                      short: true,
                    },
                    {
                      title: "평균 처리시간",
                      value: `${Math.round(avgDuration)}ms`,
                      short: true,
                    },
                    {
                      title: "오류 수",
                      value: `${error}회`,
                      short: true,
                    },
                  ],
                  footer: "YAGO SPORTS AI 시스템",
                  ts: Math.floor(Date.now() / 1000),
                },
              ],
            }),
          });

          logger.info("📤 Slack 주간 리포트 전송 완료");
        } catch (slackError: any) {
          logger.error("❌ Slack 알림 전송 오류:", slackError);
          // Slack 오류는 전체 프로세스를 실패시키지 않음
        }
      } else {
        logger.warn("⚠️ Slack Webhook URL이 설정되지 않아 알림을 건너뜁니다.");
      }

      const duration = Date.now() - startTime;
      await import("./logWorkflowEvent").then((m) =>
        m.logWorkflowEvent("generateWorkflowSummary", "success", duration)
      );
    } catch (error: any) {
      logger.error("❌ 주간 워크플로우 통계 생성 오류:", error);
      const duration = Date.now() - startTime;
      await import("./logWorkflowEvent").then((m) =>
        m.logWorkflowEvent("generateWorkflowSummary", "error", duration, error.message)
      );
      await sendSlackAlert(`🚨 [generateWorkflowSummary] 통계 생성 오류: ${error.message}`);
    }
  }
);

