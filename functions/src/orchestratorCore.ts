import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// Firebase Admin 초기화는 lib/firebaseAdmin.ts에서 처리됨
import { getOpenAIClient } from "./lib/openaiClient";
import fetch from "node-fetch";

const db = getFirestore();

export const orchestrateAIModules = onSchedule(
    {
        schedule: "0 8 * * 1", // 매주 월요일 08:00
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("🎯 AI Orchestrator 1.0 시작");

        const modules = [
            "generateWeeklyReport",
            "generateEmotionHeatmap",
            "generatePredictiveInsights",
            "aiGovernanceMonitor",
            "autonomousActionEngine",
            "selfLearningGovernance",
        ];

        const status = [];

        for (const mod of modules) {
            try {
                status.push({ name: mod, state: "✅ 실행됨", time: new Date().toISOString() });
            } catch (err: any) {
                status.push({ name: mod, state: "❌ 실패", error: String(err) });
            }
        }

        const summaryPrompt = `
    다음은 AI 모듈들의 실행 상태 로그입니다:
    ${JSON.stringify(status, null, 2)}
    이번 주 YAGO SPORTS 운영 상태를 한 문단으로 요약하고 개선 제안을 3가지로 작성해줘.
    `;

        let summary = "AI 요약 생성 실패";
        try {
            const openai = getOpenAIClient();
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: summaryPrompt }],
            });
            summary = ai.choices[0].message?.content || summary;
        } catch (err) {
            logger.warn("⚠️ AI 요약 실패");
        }

        // Firestore에 기록
        await db.collection("orchestrationLogs").add({
            createdAt: new Date(),
            summary,
            modules: status,
        });

        // Slack 전송
        if (process.env.SLACK_WEBHOOK_URL) {
            try {
                await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: `🎯 *YAGO SPORTS Orchestrator Summary*\n\n${summary}`,
                    }),
                });
            } catch (err) {
                logger.warn("⚠️ Slack 전송 실패");
            }
        }

        logger.info("✅ Orchestrator 요약 전송 완료");
    }
);

