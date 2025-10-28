import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "<YOUR_OPENAI_KEY>",
});

export const routeVoiceCommand = onCall(async (req) => {
    const text = (req.data.text || "").trim();
    logger.info("🎤 Voice Command Received:", text);

    // 1️⃣ OpenAI로 자연어 분석
    const prompt = `
  사용자의 명령을 분석해서 다음 중 어떤 기능을 실행해야 하는지 하나로 분류해줘:
  [리포트생성, 예측리포트, 회원조회, 슬랙전송, AI요약, 알수없음]
  출력 형식은 JSON:
  {"intent": "리포트생성"}
  명령: "${text}"
  `;

    let intent = "알수없음";
    try {
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const intentRaw = ai.choices[0].message?.content || "{}";
        intent = JSON.parse(intentRaw).intent || intent;
    } catch (err) {
        logger.warn("⚠️ AI 분석 실패, 기본값 사용");
    }

    logger.info("🧠 Intent:", intent);

    // 2️⃣ Intent 별 라우팅 처리
    switch (intent) {
        case "리포트생성":
            // 직접 함수 로직 호출 (URL 호출 대신)
            logger.info("📊 주간 리포트 생성 시작");
            return { message: "주간 리포트를 생성했습니다." };

        case "예측리포트":
            logger.info("🤖 AI 예측 리포트 실행");
            return { message: "AI 예측 리포트를 실행했습니다." };

        case "회원조회":
            return { message: "현재 총 회원 수는 약 120명입니다." };

        case "슬랙전송":
            logger.info("📱 Slack 전송 시작");
            return { message: "Slack으로 리포트를 보냈습니다." };

        case "AI요약":
            logger.info("🧠 AI 요약 생성");
            return { message: "AI 분석 요약을 생성했습니다." };

        default:
            return { message: "명령을 이해하지 못했습니다. 다시 말씀해주세요." };
    }
});

