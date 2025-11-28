import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import OpenAI from "openai";

const db = getFirestore();

export const analyzeVoiceFeedback = onCall(async (req) => {
    // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
    });
    const { team, text } = req.data;
    if (!team || !text) return { error: "팀명과 텍스트가 필요합니다." };

    logger.info("🎤 음성 피드백 수신:", { team, text });

    const prompt = `
  팀원 피드백: "${text}"
  다음 감정 지표를 분석해서 JSON으로 반환해줘:
  { "감정": "긍정/부정/중립", "피로도": "낮음/보통/높음", "만족도": 0~100, "요약": "..." }
  `;

    let parsed: any = { 감정: "중립", 피로도: "보통", 만족도: 50, 요약: "AI 분석 실패" };

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

    await db.collection("voiceFeedbacks").add({
        team,
        text,
        ...parsed,
        createdAt: new Date(),
    });

    // 팀별 요약 평균 업데이트
    const feedbacksSnap = await db
        .collection("voiceFeedbacks")
        .where("team", "==", team)
        .get();

    const avgSatisfaction =
        feedbacksSnap.docs.reduce((sum, f) => sum + (f.data().만족도 || 0), 0) /
        (feedbacksSnap.size || 1);

    await db.collection("teamSummaries").doc(team).update({
        avgSatisfaction,
        lastFeedback: parsed.요약,
        lastEmotion: parsed.감정,
        lastFatigue: parsed.피로도,
    });

    return { message: `✅ ${team} 피드백이 반영되었습니다.`, analysis: parsed };
});

