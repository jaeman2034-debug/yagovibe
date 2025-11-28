import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
// 🔥 Lazy import: 무거운 모듈들은 함수 내부에서 동적 import
// import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

/**
 * AI 검색 메타데이터 생성
 * - tags: 화면에 보여줄 태그 (3~6개)
 * - keywordTokens: Firestore 검색용 토큰 배열
 * - searchText: 통합 검색용 텍스트
 */
export const generateSearchMeta = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // 🔥 Lazy import: 무거운 모듈들을 함수 실행 시점에 동적으로 로드
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });

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
      const { productName, category, description } = req.body;

      if (!productName && !description) {
        res.status(400).json({ error: "productName 또는 description이 필요합니다." });
        return;
      }

      logger.info("🔍 검색 메타데이터 생성 요청:", { productName, category });

      const prompt = `
너는 중고 거래 플랫폼의 검색 최적화(SEO) 전문가야.

아래 상품 정보를 보고,
1) 화면에 보여줄 짧은 태그들
2) Firestore 검색용 키워드 토큰 배열
3) 통합 검색용 문자열(searchText)

을 JSON으로 만들어줘.

[상품명]
${productName || ""}

[카테고리]
${category || ""}

[설명]
${description || ""}

규칙:
- 한국어 기준
- 브랜드/모델명, 용도, 주요 특징, 타겟(남성/여성/학생 등), 연식, 상태를 반영
- tags: 3~6개, 짧고 보기 좋게 (예: ["축구화", "나이키", "중고"])
- keywordTokens: 띄어쓰기 기준 토큰, 중복 제거, 소문자/자모 분리 없는 형태 (예: ["축구화", "축구", "운동화", "나이키", "중고", "풋살"])
- searchText: tags + keywordTokens + 상품명 + 카테고리 + 설명에서 중요한 단어만 모아 한 줄로 (예: "축구화 나이키 운동화 중고 풋살 축구 신발")

정확히 아래 JSON 형식으로만 답해줘 (다른 설명 없이 JSON만):

{
  "tags": ["태그1", "태그2"],
  "keywordTokens": ["토큰1", "토큰2"],
  "searchText": "검색용 문장"
}
`;

      try {
        const resp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고 거래 플랫폼의 검색 최적화 전문가입니다. 상품 정보를 분석하여 검색에 최적화된 메타데이터를 생성합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 500,
        });

        const text = resp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 검색 메타데이터 생성 결과:", text);

        // JSON 파싱
        let result: any;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(text);
          }

          // 필수 필드 검증 및 기본값 설정
          result = {
            tags: Array.isArray(result.tags) && result.tags.length > 0
              ? result.tags.filter((tag: any) => typeof tag === "string" && tag.length > 0).slice(0, 6)
              : [],
            keywordTokens: Array.isArray(result.keywordTokens) && result.keywordTokens.length > 0
              ? [...new Set(result.keywordTokens.filter((token: any) => typeof token === "string" && token.length > 0))]
              : [],
            searchText: typeof result.searchText === "string" && result.searchText.length > 0
              ? result.searchText
              : `${productName || ""} ${category || ""} ${description || ""}`.trim(),
          };

          // searchText가 비어있으면 기본값 생성
          if (!result.searchText || result.searchText.trim().length === 0) {
            const allKeywords = [
              ...result.tags,
              ...result.keywordTokens,
              productName,
              category,
            ].filter(Boolean).join(" ");
            result.searchText = allKeywords || `${productName || ""} ${category || ""}`.trim();
          }

          logger.info("✅ 검색 메타데이터 생성 완료:", result);
          res.json(result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          
          // Fallback: 간단한 키워드 추출
          const fallbackTags = [category, productName].filter(Boolean).slice(0, 3);
          const fallbackTokens = [
            productName,
            category,
            ...(description || "").split(/\s+/).filter((w: string) => w.length > 1).slice(0, 5),
          ].filter(Boolean);
          const fallbackSearchText = `${productName || ""} ${category || ""} ${description || ""}`.trim();

          res.json({
            tags: fallbackTags,
            keywordTokens: [...new Set(fallbackTokens)],
            searchText: fallbackSearchText,
          });
        }
      } catch (aiError: any) {
        logger.error("❌ AI 검색 메타데이터 생성 오류:", aiError);
        
        // Fallback: 기본 메타데이터 생성
        const fallbackTags = [category, productName].filter(Boolean).slice(0, 3);
        const fallbackTokens = [
          productName,
          category,
          ...(description || "").split(/\s+/).filter((w: string) => w.length > 1).slice(0, 5),
        ].filter(Boolean);
        const fallbackSearchText = `${productName || ""} ${category || ""} ${description || ""}`.trim();

        res.json({
          tags: fallbackTags,
          keywordTokens: [...new Set(fallbackTokens)],
          searchText: fallbackSearchText,
        });
      }
    } catch (e: any) {
      logger.error("🔥 검색 메타데이터 생성 서버 오류:", e);
      res.status(500).json({ error: true, message: e.message });
    }
  }
);

