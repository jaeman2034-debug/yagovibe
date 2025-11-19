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
 * AI 유사상품 추천 시스템
 * - 상품 상세 페이지에서 비슷한 상품 추천
 * - 의미 기반 유사도 계산 (Semantic Similarity)
 * - 카테고리, 태그, 설명, 가격, 등급 등을 종합 고려
 */
export const recommendSimilar = onRequest(
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
      const { base, candidates, userLocation } = req.body;

      if (!base || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
        res.json({ ranked: [] });
        return;
      }

      logger.info("🔍 AI 유사상품 추천 요청:", { baseId: base.id, candidateCount: candidates.length });

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
        imageUrl: c.imageUrl || null,
      }));

      const userLocInfo = userLocation
        ? `사용자 위치: 위도 ${userLocation.lat}, 경도 ${userLocation.lng}`
        : "사용자 위치: 정보 없음";

      // 기준 상품 정보 정리
      const baseInfo = {
        id: base.id || "",
        name: base.name || "",
        category: base.category || "",
        description: typeof base.description === "string" ? base.description.substring(0, 200) : "",
        tags: Array.isArray(base.tags) ? base.tags.slice(0, 10) : [],
        price: typeof base.price === "number" ? base.price : 0,
        latitude: base.latitude || null,
        longitude: base.longitude || null,
        aiOneLine: base.aiOneLine || "",
        imageUrl: base.imageUrl || null,
      };

      const prompt = `
너는 중고거래 플랫폼의 "AI 유사상품 추천 엔진"이야.

### 기준 상품
${JSON.stringify(baseInfo, null, 2)}

### 사용자 위치
${userLocInfo}

### 후보 상품들 (${candidateInfo.length}개)
${JSON.stringify(candidateInfo.slice(0, 50), null, 2)}${candidateInfo.length > 50 ? `\n... 외 ${candidateInfo.length - 50}개` : ""}

### 작업
각 후보 상품이 기준 상품과 얼마나 유사한지 0~1로 점수 계산해줘.

### 유사도 기준 (하이브리드 스코어링)
1) **카테고리 동일/유사도** (20%)
   - 같은 카테고리면 높은 점수
   - 유사 카테고리면 중간 점수

2) **제목 의미적 유사도** (25%)
   - 브랜드, 모델명, 특징이 비슷하면 높은 점수
   - 의미적으로 관련 있으면 중간 점수

3) **설명 의미적 유사도** (15%)
   - 설명 내용이 비슷하면 높은 점수

4) **태그 유사성** (15%)
   - 공통 태그가 많을수록 높은 점수

5) **가격대 비슷함** (10%)
   - 가격 차이가 적을수록 높은 점수 (±30% 이내면 높음)

6) **거리 가까움** (10%)
   - 가까울수록 높은 점수 (위치 정보가 있으면)

7) **종합 등급(score) 가까움** (5%)
   - 종합 등급이 비슷하면 높은 점수

### 출력 형식(JSON only):
{
  "ranked": [
    { "id": "상품ID1", "score": 0.0~1.0, "reasons": ["이유1", "이유2"] },
    { "id": "상품ID2", "score": 0.0~1.0, "reasons": ["이유1"] },
    ...
  ]
}

조건:
- ranked는 score 높은 순으로 정렬 (상위 20개만)
- score는 0.0~1.0 사이 숫자
- reasons는 간단한 이유 1~3개 (있는 경우만)
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 AI 유사상품 추천 엔진입니다. 상품 간 의미적 유사도를 정확하게 계산합니다.",
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
        logger.info("🤖 AI 유사상품 추천 결과:", aiText.substring(0, 300));

        // JSON 파싱
        let result: {
          ranked: Array<{
            id: string;
            score: number;
            reasons?: string[];
          }>;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // ranked 검증 및 정규화
          const ranked = Array.isArray(parsed.ranked)
            ? parsed.ranked
                .map((item: any) => {
                  if (!item.id || typeof item.id !== "string") return null;
                  let score = typeof item.score === "number" ? item.score : 0;
                  score = Math.max(0, Math.min(1, score)); // 0~1 범위로 제한
                  const reasons = Array.isArray(item.reasons)
                    ? item.reasons.filter((r: any) => typeof r === "string").slice(0, 3)
                    : [];
                  return { id: item.id, score, reasons };
                })
                .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null)
                .sort((a, b) => b.score - a.score) // score 높은 순
                .slice(0, 20) // 상위 20개만
            : [];

          result = { ranked };
          logger.info("✅ AI 유사상품 추천 완료:", { count: ranked.length });
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 유사도 계산
          const baseCategory = baseInfo.category || "";
          const basePrice = baseInfo.price || 0;
          const baseTags = baseInfo.tags || [];

          const ranked = candidateInfo
            .map((c: any) => {
              if (c.id === baseInfo.id) return null; // 자기 자신 제외

              let score = 0;

              // 카테고리 매칭 (20%)
              if (c.category === baseCategory) score += 0.2;

              // 태그 유사성 (15%)
              const commonTags = baseTags.filter((tag: string) => c.tags?.includes(tag));
              score += Math.min(0.15, (commonTags.length / Math.max(baseTags.length, 1)) * 0.15);

              // 가격대 비슷함 (10%)
              if (basePrice > 0 && c.price > 0) {
                const priceDiff = Math.abs(c.price - basePrice) / basePrice;
                if (priceDiff <= 0.3) score += 0.1;
                else if (priceDiff <= 0.5) score += 0.05;
              }

              // 거리 가까움 (10%)
              if (userLocation && c.latitude && c.longitude && baseInfo.latitude && baseInfo.longitude) {
                const distance1 = Math.sqrt(
                  Math.pow(c.latitude - userLocation.lat, 2) + Math.pow(c.longitude - userLocation.lng, 2)
                );
                const distance2 = Math.sqrt(
                  Math.pow(baseInfo.latitude - userLocation.lat, 2) + Math.pow(baseInfo.longitude - userLocation.lng, 2)
                );
                const distanceDiff = Math.abs(distance1 - distance2);
                if (distanceDiff < 0.01) score += 0.1;
                else if (distanceDiff < 0.05) score += 0.05;
              }

              // 제목 유사성 (25%) - 간단한 문자열 매칭
              const nameSimilarity = baseInfo.name && c.name
                ? (c.name.toLowerCase().includes(baseInfo.name.toLowerCase()) || baseInfo.name.toLowerCase().includes(c.name.toLowerCase()) ? 0.25 : 0)
                : 0;
              score += nameSimilarity;

              // 설명 유사성 (15%) - 간단한 문자열 매칭
              const descSimilarity = baseInfo.description && c.description
                ? (c.description.toLowerCase().includes(baseInfo.description.toLowerCase()) || baseInfo.description.toLowerCase().includes(c.description.toLowerCase()) ? 0.15 : 0)
                : 0;
              score += descSimilarity;

              return { id: c.id, score: Math.min(1, score), reasons: [] };
            })
            .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null && item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

          result = { ranked };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 유사상품 추천 오류:", aiError);
        // Fallback: 기본 유사도 계산
        const baseCategory = baseInfo.category || "";
        const basePrice = baseInfo.price || 0;
        const baseTags = baseInfo.tags || [];

        const ranked = candidateInfo
          .map((c: any) => {
            if (c.id === baseInfo.id) return null;

            let score = 0;
            if (c.category === baseCategory) score += 0.2;
            const commonTags = baseTags.filter((tag: string) => c.tags?.includes(tag));
            score += Math.min(0.15, (commonTags.length / Math.max(baseTags.length, 1)) * 0.15);
            if (basePrice > 0 && c.price > 0) {
              const priceDiff = Math.abs(c.price - basePrice) / basePrice;
              if (priceDiff <= 0.3) score += 0.1;
            }

            return score > 0 ? { id: c.id, score: Math.min(1, score), reasons: [] } : null;
          })
          .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null)
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);

        res.json({ ranked });
      }
    } catch (e: any) {
      logger.error("🔥 유사상품 추천 서버 오류:", e);
      res.status(500).json({ ranked: [] });
    }
  }
);

