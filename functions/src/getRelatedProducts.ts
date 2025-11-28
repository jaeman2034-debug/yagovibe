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
 * AI 기반 연관 상품 추천
 * - 현재 상품과 후보 상품들의 유사도를 AI가 분석하여 점수화
 * - 카테고리, 태그, 상품명, 설명 기반 유사도 계산
 */
export const getRelatedProducts = onRequest(
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
      const { current, candidates } = req.body;

      if (!current || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
        res.json({ related: [] });
        return;
      }

      logger.info("🔮 연관 상품 추천 요청:", {
        currentId: current.id || current.name,
        candidateCount: candidates.length,
      });

      // 후보 상품이 너무 많으면 상위 20개만 분석 (성능 최적화)
      const limitedCandidates = candidates.slice(0, 20);

      const prompt = `
너는 중고거래 플랫폼의 상품 추천 알고리즘 전문가야.

아래 현재 상품(current)와 후보 상품들(candidates)을 비교해서
각 후보 상품과의 유사도를 0~1 사이로 점수화해줘.

유사도 평가 요소:
1. 카테고리 유사도 (같은 카테고리면 높은 점수)
2. 태그 유사도 (공통 태그가 많을수록 높은 점수)
3. 상품명 키워드 유사도 (비슷한 키워드 포함 여부)
4. 설명 기반 의미적 유사도 (설명 내용이 비슷한지)
5. 브랜드 유사도 (같은 브랜드면 추가 점수)

출력 형식(JSON 배열):
[
  {
    "id": "상품ID",
    "score": 0.83
  },
  ...
]

조건:
- 점수가 높은 순서로 정렬
- 최대 10개만 반환
- 점수는 0.0~1.0 사이
- 반드시 유효한 JSON 배열만 출력 (다른 설명 없이)

[current]
${JSON.stringify({
  id: current.id || "",
  name: current.name || "",
  category: current.category || "",
  tags: current.tags || current.aiTags || [],
  description: (current.description || "").substring(0, 200), // 설명은 200자만
  brand: current.brand || "",
}, null, 2)}

[candidates]
${JSON.stringify(
  limitedCandidates.map((c: any) => ({
    id: c.id || "",
    name: c.name || "",
    category: c.category || "",
    tags: c.tags || c.aiTags || [],
    description: (c.description || "").substring(0, 200),
    brand: c.brand || "",
  })),
  null,
  2
)}
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 상품 추천 알고리즘 전문가입니다. 상품 간 유사도를 정확하게 분석하여 점수화합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1000,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 연관 상품 분석 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let related: Array<{ id: string; score: number }> = [];
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // related 필드가 있으면 사용, 없으면 배열 자체로 처리
          if (Array.isArray(parsed)) {
            related = parsed;
          } else if (Array.isArray(parsed.related)) {
            related = parsed.related;
          } else if (Array.isArray(parsed.results)) {
            related = parsed.results;
          }

          // 유효성 검증 및 정리
          related = related
            .filter((r: any) => r.id && typeof r.score === "number" && r.score >= 0 && r.score <= 1)
            .sort((a, b) => b.score - a.score) // 점수 높은 순 정렬
            .slice(0, 10); // 최대 10개

          logger.info("✅ 연관 상품 추천 완료:", related.length, "개");
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);

          // Fallback: 간단한 유사도 계산 (카테고리 + 태그 기반)
          const currentCategory = current.category || "";
          const currentTags = current.tags || current.aiTags || [];

          related = limitedCandidates
            .map((c: any) => {
              let score = 0;
              // 카테고리 일치
              if (c.category === currentCategory) score += 0.5;
              // 태그 유사도
              const cTags = c.tags || c.aiTags || [];
              const commonTags = currentTags.filter((t: string) => cTags.includes(t));
              score += (commonTags.length / Math.max(currentTags.length, cTags.length, 1)) * 0.3;
              // 상품명 키워드 유사도
              const currentName = (current.name || "").toLowerCase();
              const cName = (c.name || "").toLowerCase();
              if (currentName && cName) {
                const currentWords = currentName.split(/\s+/);
                const cWords = cName.split(/\s+/);
                const commonWords = currentWords.filter((w) => cWords.includes(w));
                score += (commonWords.length / Math.max(currentWords.length, cWords.length, 1)) * 0.2;
              }
              return { id: c.id || "", score: Math.min(score, 1.0) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        }

        res.json({ related });
      } catch (aiError: any) {
        logger.error("❌ AI 연관 상품 추천 오류:", aiError);

        // Fallback: 간단한 유사도 계산
        const currentCategory = current.category || "";
        const currentTags = current.tags || current.aiTags || [];

        const related = limitedCandidates
          .map((c: any) => {
            let score = 0;
            if (c.category === currentCategory) score += 0.5;
            const cTags = c.tags || c.aiTags || [];
            const commonTags = currentTags.filter((t: string) => cTags.includes(t));
            score += (commonTags.length / Math.max(currentTags.length, cTags.length, 1)) * 0.5;
            return { id: c.id || "", score: Math.min(score, 1.0) };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        res.json({ related });
      }
    } catch (e: any) {
      logger.error("🔥 연관 상품 추천 서버 오류:", e);
      res.status(500).json({ related: [] });
    }
  }
);

