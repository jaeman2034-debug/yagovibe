import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import OpenAI from "openai";

initializeApp();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const voiceAnalyticsAssistant = onCall(async (req) => {
    const text = (req.data.text || "").trim();
    logger.info("🎤 음성 질의 수신:", text);

    const db = getFirestore();

    try {
        // 1️⃣ 데이터 수집
        const reportsSnap = await db.collection("weeklyReports").orderBy("createdAt", "desc").limit(5).get();
        const reports = reportsSnap.docs.map((d) => d.data());
        const labels = reports.map((r) =>
            new Date(r.createdAt?.toDate?.() || r.createdAt).toLocaleDateString("ko-KR")
        );
        const members = reports.map((r) => r.totalMembers || 0);
        const matches = reports.map((r) => r.totalMatches || 0);

        // 2️⃣ AI 요약 문장 생성
        const prompt = `
    사용자의 질문: "${text}"
    최근 ${reports.length}주간 회원 수와 경기 수 데이터는 다음과 같습니다.
    회원 수: ${members.join(", ")}
    경기 수: ${matches.join(", ")}
    이에 대한 주요 변화 요약과 인사이트를 2~3문장으로 설명해줘.
    `;

        let summary = "AI 요약 생성 실패";
        try {
            const aiRes = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            });
            summary = aiRes.choices[0].message?.content || summary;
        } catch (aiError) {
            logger.warn("⚠️ AI 요약 생성 실패");
        }

        // 3️⃣ 그래프 데이터 반환 (이미지 대신 데이터)
        const chartData = {
            labels,
            datasets: [
                { label: "회원 수", data: members },
                { label: "경기 수", data: matches },
            ],
        };

        return {
            summary,
            chartData,
            message: `📊 리포트를 완성했습니다.`,
        };
    } catch (err) {
        logger.error("❌ Voice Analytics 오류", err);
        return { error: String(err) };
    }
});

