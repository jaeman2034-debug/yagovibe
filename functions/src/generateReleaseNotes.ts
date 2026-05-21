import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import fetch from "node-fetch";
import { sendSlackAlert } from "./slackAlertHandler";
import { logWorkflowEvent } from "./logWorkflowEvent";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * 릴리즈 노트 생성 로직
 */
async function generateReleaseNotesLogic(): Promise<{
  ok: boolean;
  note?: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    logger.info("📝 릴리즈 노트 자동 생성 시작");

    if (!process.env.OPENAI_API_KEY) {
      logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않았습니다.");
      return { ok: false, error: "OPENAI_API_KEY not configured" };
    }

    // 최근 1주간 데이터 수집
    const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // reports 컬렉션에서 date 필드가 있는 경우에만 쿼리
    // date 필드가 없거나 다른 구조일 수 있으므로 try-catch로 처리
    let reportsSnap: any;
    try {
      reportsSnap = await db.collection("reports").where("date", ">=", oneWeekAgo).limit(10).get();
    } catch (e: any) {
      // date 필드가 없거나 인덱스가 없는 경우 빈 결과 반환
      logger.warn("⚠️ reports 쿼리 오류 (date 필드 또는 인덱스 없음), 빈 결과 사용", e.message);
      reportsSnap = { docs: [], empty: true, size: 0 };
    }

    const [logsSnap, feedbackSnap, checkSnap] = await Promise.all([
      db.collection("workflowLogs").where("timestamp", ">=", oneWeekAgo).limit(20).get(),
      db.collection("betaFeedback").orderBy("createdAt", "desc").limit(10).get(),
      db.doc("releaseChecks/latest").get(),
    ]);

    const reports = reportsSnap.docs ? reportsSnap.docs.map((d: any) => d.data()) : [];
    const logs = logsSnap.docs.map((d) => d.data());
    const feedbacks = feedbackSnap.docs.map((d) => d.data());
    const releaseCheck = checkSnap.exists ? checkSnap.data() : null;

    // 데이터 요약
    const reportCount = reports.length;
    const successCount = logs.filter((l) => l.status === "success").length;
    const errorCount = logs.filter((l) => l.status === "error").length;
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length
        : 0;

    // 주요 기능 및 개선사항 추출
    const features: string[] = [];
    const improvements: string[] = [];
    const bugs: string[] = [];

    feedbacks.forEach((f) => {
      if (f.what) features.push(f.what);
      if (f.idea) improvements.push(f.idea);
      if (f.issue) bugs.push(f.issue);
    });

    // OpenAI로 릴리즈 노트 생성
    const prompt = `최근 1주간의 YAGO SPORTS AI 리포트 시스템 운영 데이터를 바탕으로 릴리즈 노트를 작성해주세요.

**운영 통계:**
- 리포트 생성: ${reportCount}개
- Functions 실행 성공: ${successCount}회
- Functions 실행 오류: ${errorCount}회
- 평균 사용자 평점: ${avgRating.toFixed(1)}/5.0
${releaseCheck ? `- SLO 준수 여부: ${releaseCheck.sloMet ? "✅ 충족" : "❌ 미충족"}` : ""}

**사용자 피드백:**
${features.length > 0 ? `좋은 점:\n${features.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join("\n")}` : ""}
${improvements.length > 0 ? `개선 제안:\n${improvements.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join("\n")}` : ""}
${bugs.length > 0 ? `이슈:\n${bugs.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join("\n")}` : ""}

위 데이터를 바탕으로:
1. 주요 개선사항 (3-5개)
2. 버그 수정 (있는 경우)
3. 새로운 기능 (있는 경우)
4. 성능 개선
5. 다음 릴리즈 계획

형식으로 릴리즈 노트를 작성해주세요. 한국어로 작성하고, 마크다운 형식을 사용해주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const note = response.choices[0]?.message?.content?.trim();

    if (!note) {
      logger.error("❌ AI 응답이 비어있습니다.");
      return { ok: false, error: "Empty AI response" };
    }

    // Firestore에 저장
    await db.collection("releaseNotes").doc("latest").set({
      content: note,
      version: `v1.${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, "0")}.${String(new Date().getDate()).padStart(2, "0")}`,
      reportCount,
      successCount,
      errorCount,
      avgRating: avgRating.toFixed(1),
      generatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("✅ 릴리즈 노트 생성 완료");

    // Slack 알림
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.SLACK_ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `📝 *릴리즈 노트 자동 생성 완료*\n\n${note.slice(0, 500)}${note.length > 500 ? "..." : ""}`,
            attachments: [
              {
                color: "#36a64f",
                footer: "YAGO SPORTS AI 시스템",
                ts: Math.floor(Date.now() / 1000),
              },
            ],
          }),
        });

        logger.info("✅ Slack 릴리즈 노트 알림 전송 완료");
      } catch (slackError: any) {
        logger.error("❌ Slack 알림 전송 오류:", slackError);
      }
    }

    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateReleaseNotes", "success", duration);

    return { ok: true, note };
  } catch (error: any) {
    logger.error("❌ 릴리즈 노트 생성 오류:", error);
    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateReleaseNotes", "error", duration, error.message);
    await sendSlackAlert(`🚨 [generateReleaseNotes] 노트 생성 오류: ${error.message}`);
    return { ok: false, error: error.message || "Unknown error" };
  }
}

/**
 * 스케줄러 함수: 매주 월요일 10:30 KST 자동 실행
 */
export const generateReleaseNotesJob = onSchedule(
  {
    schedule: "30 10 * * 1", // 매주 월요일 10:30
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 180,
  },
  async (event) => {
    try {
      logger.info("🕘 릴리즈 노트 자동 생성 시작", { scheduleTime: event.scheduleTime });
      const result = await generateReleaseNotesLogic();
      if (result.ok) {
        logger.info("✅ 릴리즈 노트 자동 생성 완료");
      } else {
        logger.error("❌ 릴리즈 노트 자동 생성 실패", { error: result.error });
      }
    } catch (error: any) {
      logger.error("❌ 릴리즈 노트 자동 생성 오류:", error);
    }
  }
);

/**
 * HTTP 함수: 수동으로 릴리즈 노트 생성
 */
export const generateReleaseNotes = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 3,
    timeoutSeconds: 180,
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

      const result = await generateReleaseNotesLogic();

      if (result.ok) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      logger.error("❌ 릴리즈 노트 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateReleaseNotes", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateReleaseNotes HTTP] 오류 발생: ${error.message}`);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

