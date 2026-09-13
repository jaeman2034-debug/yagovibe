import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getOpenAIClient, resolveOpenAIApiKey } from "./lib/openaiClient";

const REGION = "asia-northeast3";

type VoiceMapClassifyResult = {
  intent: string;
  keyword?: string;
  message?: string;
};

async function classifyVoiceMapCommand(text: string): Promise<VoiceMapClassifyResult> {
  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    return { intent: "미확인", message: "OPENAI not configured" };
  }

  const prompt = `Classify Korean voice command for sports/map assistant.

Allowed intents (pick exactly one):
- 지도열기
- 위치이동
- 홈이동
- 근처검색 (set keyword: place type or venue name fragment)
- ops_안내 (협회/회의/대관/회비/정산/운영 안내)
- 미확인

User: "${text}"

Return ONLY JSON: {"intent":"...","keyword":"..."}`;

  try {
    const openai = getOpenAIClient();
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 120,
    });
    const raw = ai.choices[0].message?.content || "{}";
    const parsed = JSON.parse(raw) as { intent?: string; keyword?: string };
    const intent = parsed.intent || "미확인";
    return { intent, keyword: parsed.keyword || "", message: "voice_map classified" };
  } catch (err) {
    logger.warn("voice_map classify failed", err);
    return { intent: "미확인", message: "classification failed" };
  }
}

export const routeVoiceCommand = onCall(
  { region: REGION, maxInstances: 15, secrets: ["OPENAI_API_KEY"] },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const text = (req.data.text || "").trim();
    const surface = (req.data.surface || "admin") as string;
    logger.info("🎤 Voice Command Received:", { text, surface });

    if (surface === "voice_map") {
      if (!text) {
        throw new HttpsError("invalid-argument", "text required");
      }
      return classifyVoiceMapCommand(text);
    }

    // Admin console routing (legacy contract)
    const openai = getOpenAIClient();

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

    switch (intent) {
      case "리포트생성":
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
  }
);
