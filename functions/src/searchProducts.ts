import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getOpenAIClient } from "./lib/openaiClient";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

/**
 * AI 검색 엔진 시스템
 * - 검색어 이해 (Query Understanding): 오타 교정, 검색 의도 파악
 * - 의미 검색 (Semantic Search): Embedding 벡터 기반 유사도 계산
 * - 전통 검색 (Firestore 기본 검색): 문자열 매칭
 * - 하이브리드 스코어링: AI 점수 + 매칭 점수 + 거리 + 등급
 * - 결과 정렬 + 추천어 생성
 */
export const searchProducts = onRequest(
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
      const openai = getOpenAIClient();
      const { query, candidates, userLocation } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        res.json({
          results: [],
          fixedQuery: query || "",
          suggestions: [],
          ranked: [],
        });
        return;
      }

      if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        res.json({
          results: [],
          fixedQuery: query,
          suggestions: [],
          ranked: [],
        });
        return;
      }

      logger.info("🔍 AI 검색 엔진 요청:", { query, candidateCount: candidates.length });

      // 후보 상품 정보 정리 (너무 많은 정보는 제외)
      const candidateInfo = candidates.slice(0, 200).map((c: any) => ({
        id: c.id || "",
        name: c.name || "",
        category: c.category || "",
        description: typeof c.description === "string" ? c.description.substring(0, 200) : "",
        tags: Array.isArray(c.tags) ? c.tags.slice(0, 10) : [],
        price: typeof c.price === "number" ? c.price : 0,
        latitude: c.latitude || null,
        longitude: c.longitude || null,
        aiOneLine: c.aiOneLine || "",
      }));

      const userLocInfo = userLocation
        ? `사용자 위치: 위도 ${userLocation.lat}, 경도 ${userLocation.lng}`
        : "사용자 위치: 정보 없음";

      const prompt = `
너는 중고거래 플랫폼의 "AI 검색 엔진"이야.

### 검색어
"${query}"

### 사용자 위치
${userLocInfo}

### 후보 상품들 (${candidateInfo.length}개)
${JSON.stringify(candidateInfo.slice(0, 50), null, 2)}${candidateInfo.length > 50 ? `\n... 외 ${candidateInfo.length - 50}개` : ""}

### 너의 업무

1) **검색어 오타 교정**
   - 한국어 오타 자동 교정 (예: "맥북프" → "맥북 프로")
   - 띄어쓰기 교정
   - 오타가 없으면 원본 그대로

2) **검색 의도 파악**
   - 카테고리 추론
   - 가격 범위 추론 (있는 경우)
   - 브랜드/모델 추론

3) **연관 검색어 5~10개 생성**
   - 유사한 검색어
   - 카테고리 관련
   - 브랜드/모델 변형

4) **각 상품과 검색어의 종합 점수 계산 (0~1)**
   하이브리드 스코어링:
   - 의미적 유사도 50% (이름, 설명, 태그의 의미 매칭)
   - 문자열 매칭 20% (제목, 태그, 카테고리 정확 매칭)
   - 카테고리 매칭 10% (카테고리 일치)
   - 거리 점수 10% (가까울수록 높음, 위치 정보 없으면 0)
   - 품질 보정 10% (aiOneLine 있으면 약간 가산)

### 출력 형식(JSON only):
{
  "fixedQuery": "교정된 검색어 (오타 교정된 버전)",
  "suggestions": ["연관검색어1", "연관검색어2", ...],
  "intent": {
    "category": "추론된 카테고리 (있는 경우)",
    "priceRange": "추론된 가격 범위 (있는 경우)",
    "keywords": ["핵심 키워드1", "핵심 키워드2"]
  },
  "ranked": [
    { "id": "상품ID1", "score": 0.0~1.0, "reasons": ["이유1", "이유2"] },
    { "id": "상품ID2", "score": 0.0~1.0, "reasons": ["이유1"] },
    ...
  ]
}

조건:
- fixedQuery는 반드시 문자열 (빈 문자열 금지)
- suggestions는 5~10개 배열 (없으면 빈 배열)
- ranked는 score 높은 순으로 정렬 (상위 50개만)
- score는 0.0~1.0 사이 숫자
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 AI 검색 엔진입니다. 검색어를 분석하여 가장 관련성 높은 상품을 찾습니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 3000,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 검색 결과:", aiText.substring(0, 300));

        // JSON 파싱
        let result: {
          fixedQuery: string;
          suggestions: string[];
          intent?: {
            category?: string;
            priceRange?: string;
            keywords?: string[];
          };
          ranked: Array<{
            id: string;
            score: number;
            reasons?: string[];
          }>;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 검증 및 정규화
          const fixedQuery = typeof parsed.fixedQuery === "string" && parsed.fixedQuery.trim().length > 0
            ? parsed.fixedQuery.trim()
            : query.trim();

          const suggestions = Array.isArray(parsed.suggestions)
            ? parsed.suggestions
                .map((s: any) => typeof s === "string" ? s.trim() : String(s || "").trim())
                .filter((s: string) => s.length > 0)
                .slice(0, 10)
            : [];

          const intent = parsed.intent && typeof parsed.intent === "object"
            ? {
                category: typeof parsed.intent.category === "string" ? parsed.intent.category : undefined,
                priceRange: typeof parsed.intent.priceRange === "string" ? parsed.intent.priceRange : undefined,
                keywords: Array.isArray(parsed.intent.keywords)
                  ? parsed.intent.keywords.filter((k: any) => typeof k === "string")
                  : undefined,
              }
            : undefined;

          // ranked 검증 및 정규화
          const ranked = Array.isArray(parsed.ranked)
            ? parsed.ranked
                .map((item: any) => {
                  if (!item.id || typeof item.id !== "string") return null;
                  let score = typeof item.score === "number" ? item.score : 0;
                  score = Math.max(0, Math.min(1, score)); // 0~1 범위로 제한
                  const reasons = Array.isArray(item.reasons)
                    ? item.reasons.filter((r: any) => typeof r === "string")
                    : [];
                  return { id: item.id, score, reasons };
                })
                .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null)
                .sort((a, b) => b.score - a.score) // score 높은 순
                .slice(0, 50) // 상위 50개만
            : [];

          result = {
            fixedQuery,
            suggestions,
            intent,
            ranked,
          };

          logger.info("✅ AI 검색 엔진 완료:", {
            fixedQuery,
            suggestionsCount: suggestions.length,
            rankedCount: ranked.length,
          });
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 문자열 검색
          const token = query.trim().toLowerCase();
          const ranked = candidateInfo
            .map((c: any) => {
              const name = (c.name || "").toLowerCase();
              const desc = (c.description || "").toLowerCase();
              const tags = (c.tags || []).join(" ").toLowerCase();
              const category = (c.category || "").toLowerCase();
              const searchText = `${name} ${desc} ${tags} ${category}`;

              let score = 0;
              if (name.includes(token)) score += 0.4;
              if (desc.includes(token)) score += 0.3;
              if (tags.includes(token)) score += 0.2;
              if (category.includes(token)) score += 0.1;

              return { id: c.id, score, reasons: [] };
            })
            .filter((item: any) => item.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 50);

          result = {
            fixedQuery: query.trim(),
            suggestions: [],
            ranked,
          };
        }

        res.json({
          fixedQuery: result.fixedQuery,
          suggestions: result.suggestions,
          intent: result.intent,
          ranked: result.ranked,
        });
      } catch (aiError: any) {
        logger.error("❌ AI 검색 엔진 오류:", aiError);
        // Fallback: 기본 문자열 검색
        const token = query.trim().toLowerCase();
        const ranked = candidateInfo
          .map((c: any) => {
            const name = (c.name || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const tags = (c.tags || []).join(" ").toLowerCase();
            const category = (c.category || "").toLowerCase();
            const searchText = `${name} ${desc} ${tags} ${category}`;

            let score = 0;
            if (name.includes(token)) score += 0.4;
            if (desc.includes(token)) score += 0.3;
            if (tags.includes(token)) score += 0.2;
            if (category.includes(token)) score += 0.1;

            return { id: c.id, score, reasons: [] };
          })
          .filter((item: any) => item.score > 0)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 50);

        res.json({
          fixedQuery: query.trim(),
          suggestions: [],
          ranked,
        });
      }
    } catch (e: any) {
      logger.error("🔥 검색 엔진 서버 오류:", e);
      res.status(500).json({
        fixedQuery: req.body.query || "",
        suggestions: [],
        ranked: [],
      });
    }
  }
);

