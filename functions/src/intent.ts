/**
 * 🧠 Intent Parser (LLM 기반 자연어 명령 분석)
 * 사용자 음성 텍스트를 구조화된 Intent JSON으로 변환
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: any = null;
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

// Intent 스키마 정의 (Structured Outputs)
const intentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: ["MAP_SEARCH", "MAP_NAVIGATE", "NONE"],
      description: "앱이 실행할 액션 타입",
    },
    query: {
      type: "string",
      description: "구글맵에 넣을 검색어/목적지 텍스트",
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        openNow: {
          type: "boolean",
          description: "지금 영업 중인 장소만",
        },
        parking: {
          type: "boolean",
          description: "주차 가능한 장소만",
        },
        sort: {
          type: "string",
          enum: ["NEAREST", "BEST_RATED", "DEFAULT"],
          description: "정렬 방식: NEAREST(가장 가까운), BEST_RATED(평점 높은), DEFAULT(기본)",
        },
      },
      required: ["openNow", "parking", "sort"],
    },
    autoNavigate: {
      type: "boolean",
      description: "검색 후 자동으로 길안내 여부 (안내해줘/가줘 등 포함 시 true)",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Intent 분석 신뢰도 (0~1)",
    },
  },
  required: ["type", "query", "filters", "autoNavigate", "confidence"],
} as const;

export const intent = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
    secrets: ["OPENAI_API_KEY"],
  } as any,
  async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "text required" });
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        res.status(400).json({ error: "text cannot be empty" });
        return;
      }

      logger.info("🧠 Intent 요청 수신:", trimmedText);

      const openai = await getOpenAIClient();

      // Structured Outputs로 Intent 파싱
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // gpt-4o-mini가 structured outputs 지원
        messages: [
          {
            role: "system",
            content:
              "너는 모바일 음성비서의 Intent Parser다. " +
              "사용자 한국어 문장을 앱 액션으로 변환한다. " +
              "반드시 스키마에 맞는 JSON만 출력한다. " +
              "\n\n" +
              "사용자가 장소를 찾는 요청이면 MAP_SEARCH. " +
              "길 안내/길찾기/안내해줘/가자/내비면 MAP_NAVIGATE. " +
              "애매하면 NONE. " +
              "\n\n" +
              "query는 구글맵에 그대로 넣을 문자열로 정리한다. " +
              "예: '강남역 카페 찾아줘' -> query='강남역 카페'. " +
              "조사 제거하고 핵심만 남기기. " +
              "\n\n" +
              "필터 힌트: " +
              "'지금 영업'/'영업중' -> openNow=true, " +
              "'주차'/'주차 가능' -> parking=true, " +
              "'가장 가까운'/'근처' -> sort=NEAREST, " +
              "'평점 높은'/'인기' -> sort=BEST_RATED. " +
              "명시되지 않으면 false 또는 DEFAULT. " +
              "\n\n" +
              "autoNavigate: " +
              "'안내해줘'/'가줘'/'길찾기'/'길 안내' 포함 시 true, " +
              "'찾아줘'만 있으면 false.",
          },
          {
            role: "user",
            content: trimmedText,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intent_parser",
            schema: intentSchema,
            strict: true, // 스키마 강제 모드
          },
        },
        temperature: 0, // 결정론적 응답
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      // JSON 파싱
      let intentResult;
      try {
        intentResult = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error("❌ JSON 파싱 실패:", parseError);
        throw new Error("Failed to parse intent JSON");
      }

      // 스키마 검증 (기본적인 검증)
      if (!intentResult.type || !intentResult.query || !intentResult.filters) {
        throw new Error("Invalid intent structure");
      }

      logger.info("✅ Intent 파싱 완료:", intentResult);

      res.json(intentResult);
    } catch (error: any) {
      logger.error("❌ Intent 오류:", error);
      res.status(500).json({
        error: "Intent parsing failed",
        message: error.message,
      });
    }
  }
);
