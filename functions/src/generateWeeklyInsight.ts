import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import { logWorkflowEvent } from "./logWorkflowEvent";
import { sendSlackAlert } from "./slackAlertHandler";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * 주간 인사이트 생성 로직
 */
async function generateInsightLogic(): Promise<{
  ok: boolean;
  insight?: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    logger.info("🧠 주간 AI 인사이트 생성 시작");

    if (!process.env.OPENAI_API_KEY) {
      logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음");
      return {
        ok: false,
        error: "OPENAI_API_KEY not configured",
      };
    }

    // 최근 1주간 리포트 수집
    const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reportsSnap = await db
      .collection("reports")
      .where("createdAt", ">=", oneWeekAgo)
      .orderBy("createdAt", "desc")
      .get();

    if (reportsSnap.empty) {
      logger.warn("⚠️ 최근 1주간 리포트가 없습니다.");
      return {
        ok: false,
        error: "No reports found in the last week",
      };
    }

    const texts = reportsSnap.docs.map((d) => {
      const data = d.data();
      const title = data.title || "(제목 없음)";
      const author = data.author || "익명";
      const summary = data.summary || "";
      const date = data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString().slice(0, 10)
        : data.date
        ? new Date(data.date).toISOString().slice(0, 10)
        : "날짜 미상";

      return `• [${date}] ${title} (${author}): ${summary}`;
    });

    logger.info(`📦 리포트 수집 완료: ${texts.length}개`);

    const prompt = `아래는 지난 주 생성된 스포츠 관련 리포트 요약 목록입니다.\n\n${texts.join(
      "\n"
    )}\n\n이 데이터를 바탕으로:\n\n1️⃣ 이번 주 주요 트렌드 요약 (2-3줄)\n2️⃣ 주요 키워드 3~5개 (불릿 포인트)\n3️⃣ 예측 포인트 1~2개 (불릿 포인트)\n\n출력은 JSON 형식으로 주세요:\n{\n  "trends": "주요 트렌드 요약",\n  "keywords": ["키워드1", "키워드2", "키워드3"],\n  "predictions": ["예측1", "예측2"]\n}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      logger.error("❌ AI 응답이 비어있습니다.");
      return {
        ok: false,
        error: "Empty AI response",
      };
    }

    logger.info("🤖 AI 인사이트 생성 완료");

    // Firestore에 저장
    await db.collection("insights").doc("weekly").set({
      content,
      generatedAt: FieldValue.serverTimestamp(),
      reportCount: texts.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("✅ Firestore에 인사이트 저장 완료");

    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateWeeklyInsight", "success", duration);
    return {
      ok: true,
      insight: content,
    };
  } catch (error: any) {
    logger.error("❌ 주간 인사이트 생성 오류:", error);
    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateWeeklyInsight", "error", duration, error.message);
    await sendSlackAlert(`🚨 [generateWeeklyInsight] 오류 발생: ${error.message}`);
    return {
      ok: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * HTTP 함수: 수동으로 주간 인사이트 생성
 */
export const generateWeeklyInsight = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
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

      const result = await generateInsightLogic();

      if (result.ok) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      logger.error("❌ 주간 인사이트 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateWeeklyInsight", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateWeeklyInsight HTTP] 오류 발생: ${error.message}`);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

/**
 * 스케줄러 함수: 매주 월요일 09:00 KST 자동 실행
 */
export const generateWeeklyInsightJob = onSchedule(
  {
    schedule: "0 9 * * 1",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 120,
  },
  async (event) => {
    const startTime = Date.now();
    try {
      logger.info("🕘 주간 AI 인사이트 자동 생성 시작", {
        scheduleTime: event.scheduleTime,
      });

      const result = await generateInsightLogic();

      if (result.ok) {
        logger.info("✅ 주간 AI 인사이트 자동 생성 완료");
        const duration = Date.now() - startTime;
        await logWorkflowEvent("generateWeeklyInsightJob", "success", duration);
      } else {
        logger.error("❌ 주간 AI 인사이트 자동 생성 실패", {
          error: result.error,
        });
        const duration = Date.now() - startTime;
        await logWorkflowEvent("generateWeeklyInsightJob", "error", duration, result.error);
        await sendSlackAlert(`🚨 [generateWeeklyInsightJob] 생성 실패: ${result.error}`);
      }
    } catch (error: any) {
      logger.error("❌ 주간 AI 인사이트 자동 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateWeeklyInsightJob", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateWeeklyInsightJob] 오류 발생: ${error.message}`);
    }
  }
);

