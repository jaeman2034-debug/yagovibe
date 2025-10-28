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

export const selfLearningGovernance = onSchedule(
    {
        schedule: "every 24 hours",
        timeZone: "Asia/Seoul",
    },
    async () => {
        logger.info("🧠 Self-Learning Governance 업데이트 시작");

        // 1️⃣ 학습 데이터 수집
        const [alertsSnap, opsSnap, summarySnap] = await Promise.all([
            db.collection("governanceAlerts").orderBy("createdAt", "desc").limit(30).get(),
            db.collection("opsReports").orderBy("createdAt", "desc").limit(10).get(),
            db.collection("teamSummaries").get(),
        ]);

        const alerts = alertsSnap.docs.map((d) => d.data());
        const opsReports = opsSnap.docs.map((d) => d.data());
        const summaries = summarySnap.docs.map((d) => d.data());

        // 2️⃣ AI 정책 학습 요청
        const prompt = `
    아래는 최근 YAGO VIBE 운영 데이터입니다.
    이 데이터를 분석해서 다음 정책 파라미터를 조정해줘:
    
    Alerts (최근 30개): ${JSON.stringify(alerts.length > 0 ? alerts : "데이터 없음")}
    OpsReports (최근 10개): ${JSON.stringify(opsReports.length > 0 ? opsReports : "데이터 없음")}
    TeamSummaries: ${JSON.stringify(summaries.length > 0 ? summaries.length : "데이터 없음")}

    {
      "alertThreshold": {
        "satisfactionDrop": number,
        "lowActivityLevel": "낮음|보통|높음",
        "fatigueRise": number
      },
      "reportPolicy": {
        "generationFrequency": "daily|weekly",
        "summaryLength": "short|normal|detailed"
      },
      "governanceActions": [
        {"condition":"만족도 하락", "recommendedAction":"팀장 확인"}
      ],
      "comment": "이번 조정의 이유"
    }
    `;

        let parsed: any = {
            alertThreshold: {},
            reportPolicy: {},
            governanceActions: [],
            comment: "AI 분석 실패"
        };

        try {
            const ai = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });

            const result = ai.choices[0].message?.content || "{}";
            parsed = JSON.parse(result);
        } catch (err) {
            logger.warn("⚠️ AI 학습 실패");
        }

        // 3️⃣ Firestore에 정책 버전 저장
        const versionRef = db.collection("governancePolicies").doc(`policy-${Date.now()}`);
        await versionRef.set({
            createdAt: new Date(),
            ...parsed,
        });

        // 4️⃣ 현재 정책(Active Policy) 갱신
        await db.collection("governancePolicies").doc("active").set({
            updatedAt: new Date(),
            ...parsed,
        });

        logger.info("✅ Self-Learning 정책 갱신 완료", { comment: parsed.comment });
    }
);

