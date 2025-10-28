import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";

initializeApp();
const db = getFirestore();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const generateTeamSummaries = onSchedule(
    {
        schedule: "0 7 * * 1", // 매주 월요일 오전 7시
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("📊 팀별 AI 요약 카드 생성 시작");

        const teamsSnap = await db.collection("teams").get();
        const summaries: any[] = [];

        for (const doc of teamsSnap.docs) {
            const teamId = doc.id;
            const data = doc.data();
            const members = data.members?.length || 0;
            const matches = data.matches?.length || 0;
            const recentPerf = Math.floor(Math.random() * 100); // 테스트용 가상 점수

            const prompt = `
      팀명: ${teamId}
      회원 수: ${members}
      경기 수: ${matches}
      활동 점수: ${recentPerf}
      요약:
      1. 주간 팀 활동을 한 문단으로 요약해줘.
      2. 활동 수준을 5단계 중 하나로 분류해줘: [매우 높음, 높음, 보통, 낮음, 매우 낮음]
      JSON 형식으로 출력:
      {"summary":"...", "level":"..."}
      `;

            let parsed: any = { summary: "AI 요약 실패", level: "보통" };
            try {
                const ai = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                });

                const result = ai.choices[0].message?.content || "{}";
                parsed = JSON.parse(result);
            } catch (err) {
                logger.warn("⚠️ AI 요약 실패");
            }

            summaries.push({
                teamId,
                members,
                matches,
                activityScore: recentPerf,
                summary: parsed.summary,
                level: parsed.level,
                updatedAt: new Date(),
            });
        }

        for (const s of summaries) {
            await db.collection("teamSummaries").doc(s.teamId).set(s);
        }

        logger.info("✅ 팀별 AI 요약 카드 업데이트 완료");
    }
);

