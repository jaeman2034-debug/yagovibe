import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";
import fetch from "node-fetch";

initializeApp();
const db = getFirestore();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const autonomousActionEngine = onSchedule(
    {
        schedule: "every 6 hours",
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("🤖 Autonomous Action Engine 실행 시작");

        const reportsSnap = await db
            .collection("predictiveReports")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (reportsSnap.empty) {
            logger.warn("❌ 예측 리포트 없음");
            return;
        }

        const latest = reportsSnap.docs[0].data();
        const forecasts = latest.forecast?.teamForecasts || [];

        const prompt = `
    다음 팀별 4주 예측 데이터를 보고 각 팀에 필요한 실행 조치를 결정해줘.
    가능한 액션 타입: ["휴식일 추가", "훈련 강도 조정", "코치 배정 추가", "격려 메시지 전송", "이상 없음"]
    JSON 형식:
    {"actions":[{"team":"...", "action":"...", "reason":"..."}]}
    데이터:
    ${JSON.stringify(forecasts, null, 2)}
    `;

        let parsed: any = { actions: [] };

        try {
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            const result = ai.choices[0].message?.content || "{}";
            parsed = JSON.parse(result);
        } catch (err) {
            logger.warn("⚠️ AI 분석 실패");
        }

        const actions = parsed.actions || [];
        logger.info("⚙️ AI 결정 조치:", actions.length);

        for (const act of actions) {
            const { team, action, reason } = act;

            // Firestore에 기록
            await db.collection("autonomousActions").add({
                team,
                action,
                reason,
                executedAt: new Date(),
            });

            // Slack / n8n Webhook 연동
            const webhook = process.env.SLACK_WEBHOOK_URL;
            if (webhook) {
                await fetch(webhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: `🤖 *AI Autonomous Action 수행됨*\n🏟️ 팀: ${team}\n⚙️ 조치: ${action}\n🧠 이유: ${reason}`,
                    }),
                });
            }

            // 추가 자동 조치 시뮬레이션
            if (action.includes("휴식")) {
                await db.collection("events").add({
                    team,
                    type: "휴식",
                    date: new Date(),
                    note: "AI 자동 휴식일 등록",
                });
            }
        }

        logger.info("✅ AI Autonomous Action 완료");
    }
);

