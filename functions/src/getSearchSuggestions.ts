import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

// OpenAI 클라이언트
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * AI 기반 연관 검색어 추천 (Autosuggest)
 * - 사용자 입력 기반으로 연관 검색어 5~10개 생성
 * - 중고거래 플랫폼 검색 패턴 반영
 */
export const getSearchSuggestions = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
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
      const { query } = req.body;

      if (!query || typeof query !== "string" || query.trim().length < 1) {
        res.json({ suggestions: [] });
        return;
      }

      const searchQuery = query.trim();
      logger.info("🔍 검색어 추천 요청:", searchQuery);

      const prompt = `
너는 중고거래 플랫폼의 검색어 추천 엔진이야.

사용자가 입력한 '${searchQuery}' 단어를 기반으로
아래 기준으로 연관 검색어 5~10개를 추천해줘.

규칙:
- 실제 사용자들이 많이 입력하는 형태로
- 너무 긴 문장 금지 (최대 3~4단어)
- 단어 또는 짧은 구(2~3단어)
- 제품명, 브랜드명, 별칭, 카테고리 조합 가능
- 중고거래 플랫폼에서 자주 검색되는 키워드 우선
- 유사한 의미의 다른 표현도 포함 (예: "폴더폰" → "버튼폰", "피쳐폰")
- 한국어 기준
- JSON 배열로만 출력

예시:
- 입력: "노트" → ["노트북", "갤럭시 노트", "학습 노트", "아이패드 노트필기", "노트북 충전기"]
- 입력: "게임기" → ["닌텐도 스위치", "플스4", "플스5", "레트로 게임기", "휴대용 게임기"]
- 입력: "축구화" → ["나이키 축구화", "아디다스 축구화", "풋살화", "축구 신발", "축구화 중고"]

지금 '${searchQuery}'의 추천 검색어 10개를 JSON 배열로만 출력해줘 (다른 설명 없이).
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 검색어 추천 전문가입니다. 사용자 입력을 분석하여 실제로 많이 검색되는 연관 검색어를 추천합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 300,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 검색어 추천 결과:", aiText);

        // JSON 파싱
        let suggestions: string[] = [];
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
          
          // suggestions 필드가 있으면 사용, 없으면 배열 자체로 처리
          if (Array.isArray(parsed)) {
            suggestions = parsed;
          } else if (Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions;
          } else if (Array.isArray(parsed.words)) {
            suggestions = parsed.words;
          } else if (Array.isArray(parsed.results)) {
            suggestions = parsed.results;
          }

          // 유효성 검증 및 정리
          suggestions = suggestions
            .filter((s: any) => typeof s === "string" && s.trim().length > 0 && s.trim().length <= 30)
            .map((s: string) => s.trim())
            .slice(0, 10); // 최대 10개

          logger.info("✅ 검색어 추천 완료:", suggestions);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          
          // Fallback: 간단한 키워드 확장
          const fallbackSuggestions = [
            `${searchQuery} 중고`,
            `${searchQuery} 판매`,
            `${searchQuery} 구매`,
          ];
          suggestions = fallbackSuggestions;
        }

        res.json({ suggestions });
      } catch (aiError: any) {
        logger.error("❌ AI 검색어 추천 오류:", aiError);
        
        // Fallback: 기본 추천어
        const fallbackSuggestions = [
          `${searchQuery} 중고`,
          `${searchQuery} 판매`,
        ];
        res.json({ suggestions: fallbackSuggestions });
      }
    } catch (e: any) {
      logger.error("🔥 검색어 추천 서버 오류:", e);
      res.status(500).json({ suggestions: [] });
    }
  }
);

