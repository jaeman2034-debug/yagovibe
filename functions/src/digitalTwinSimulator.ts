import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// Firebase Admin 초기화는 lib/firebaseAdmin.ts에서 처리됨
import { getOpenAIClient } from "./lib/openaiClient";

const db = getFirestore();

export const runDigitalTwinSimulation = onCall(async (req) => {
    const { team, scenario } = req.data;
    if (!team || !scenario) return { error: "팀명과 시나리오 설명이 필요합니다." };

    logger.info("🧩 Digital Twin Simulation 실행:", { team, scenario });

    // 1️⃣ 실제 팀 데이터 조회
    const teamData = await db.collection("teamSummaries").doc(team).get();
    if (!teamData.exists) {
        return { error: "팀 데이터를 찾을 수 없습니다." };
    }
    const data = teamData.data();

    // 2️⃣ AI 시뮬레이션 프롬프트
    const prompt = `
  팀명: ${team}
  현재 데이터:
  ${JSON.stringify(data, null, 2)}
  가상 시나리오: "${scenario}"

  예측 결과를 JSON 형식으로 생성해줘:
  {
    "예상참여율변화": "+10%" 또는 "-5%",
    "예상만족도": 0~100 숫자,
    "예상피로도": "낮음|보통|높음",
    "리스크요인": "...",
    "추천전략": "..." 
  }
  `;

    let parsed: any = {
        예상참여율변화: "0%",
        예상만족도: 50,
        예상피로도: "보통",
        리스크요인: "AI 분석 실패",
        추천전략: "데이터 부족",
    };

    try {
        const openai = getOpenAIClient();
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const result = ai.choices[0].message?.content || "{}";
        parsed = JSON.parse(result);
    } catch (err) {
        logger.warn("⚠️ AI 시뮬레이션 실패");
    }

    await db.collection("digitalTwinSimulations").add({
        team,
        scenario,
        ...parsed,
        createdAt: new Date(),
    });

    return { message: `✅ ${team} 시나리오 시뮬레이션 완료`, result: parsed };
});

