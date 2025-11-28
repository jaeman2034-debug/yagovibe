import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import OpenAI from "openai";

const db = getFirestore();

export const voiceMemoryAssistant = onCall(async (req) => {
    // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
    });
    const user = req.data.user || "admin";
    const text = (req.data.text || "").trim();

    const sessionRef = db.collection("voiceSessions").doc(user);
    const sessionSnap = await sessionRef.get();
    const history = sessionSnap.exists ? sessionSnap.data()?.context || "" : "";

    logger.info(`🎙️ [${user}] ${text}`);

    const prompt = `
다음은 지금까지의 대화 이력입니다:
${history}

새로운 명령: "${text}"
이전 맥락을 참고하여 어떤 동작(intent)을 실행해야 할지 JSON으로 답해줘.
가능한 intent: [리포트생성, 리포트전송, 리포트조회, 일정조회, 알수없음]
형식: {"intent": "리포트전송", "target": "지난주 리포트"}
`;

    let parsed = { intent: "알수없음" };
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const content = ai.choices[0].message?.content || "{}";
        parsed = JSON.parse(content);
    } catch (err) {
        logger.warn("⚠️ AI 파싱 실패");
    }

    // 맥락 갱신
    await sessionRef.set({
        updatedAt: new Date(),
        context: `${history}\n사용자: ${text}\nAI: ${JSON.stringify(parsed)}`,
    });

    logger.info("🧠 Context Intent:", parsed);

    switch (parsed.intent) {
        case "리포트생성":
            logger.info("📊 리포트 생성 요청");
            return { message: "📊 리포트를 새로 생성했습니다." };

        case "리포트전송":
            logger.info("💬 리포트 전송 요청");
            return { message: "💬 리포트를 전송했습니다." };

        case "리포트조회":
            logger.info("📄 리포트 조회 요청");
            return { message: "📄 최신 리포트를 보여드릴게요." };

        case "일정조회":
            logger.info("📅 일정 조회 요청");
            return { message: "📅 이번 주 경기 일정은 3건입니다." };

        default:
            return { message: "🤔 무슨 말인지 잘 모르겠어요. 다시 말씀해주세요." };
    }
});

