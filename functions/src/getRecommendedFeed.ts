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
 * AI 추천 홈 피드 생성 시스템
 * - 사용자 관심사, 위치, 최근 본 상품 등을 기반으로 맞춤 추천
 * - 후보 상품 200개를 AI가 분석하여 최적 순서로 정렬
 */
export const getRecommendedFeed = onRequest(
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
      const { user, candidates } = req.body;

      if (!user || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
        res.json({ feed: [] });
        return;
      }

      logger.info("🔥 AI 추천 피드 생성 요청:", { userId: user.uid, candidateCount: candidates.length });

      // 사용자 정보 정리
      const userInfo = {
        uid: user.uid || "",
        interests: Array.isArray(user.interests) ? user.interests : [],
        viewed: Array.isArray(user.viewed) ? user.viewed.slice(0, 10) : [], // 최근 10개
        liked: Array.isArray(user.liked) ? user.liked.slice(0, 10) : [], // 최근 10개
        location: user.lat && user.lng ? { lat: user.lat, lng: user.lng } : null,
        categories: Array.isArray(user.categories) ? user.categories : [],
      };

      // 후보 상품 정보 정리 (너무 많은 정보는 제외)
      const candidateInfo = candidates.slice(0, 200).map((c: any) => ({
        id: c.id || "",
        name: c.name || "",
        category: c.category || "",
        price: c.price || 0,
        tags: Array.isArray(c.tags) ? c.tags.slice(0, 5) : [],
        latitude: c.latitude || null,
        longitude: c.longitude || null,
        aiOneLine: c.aiOneLine || "",
        description: typeof c.description === "string" ? c.description.substring(0, 100) : "", // 최대 100자
        createdAt: c.createdAt ? "있음" : "없음",
      }));

      const prompt = `
너는 중고거래 플랫폼의 "AI 추천 엔진"이야.

### 사용자 정보:
- UID: ${userInfo.uid}
- 관심사: ${userInfo.interests.length > 0 ? userInfo.interests.join(", ") : "없음"}
- 최근 본 상품: ${userInfo.viewed.length}개
- 좋아요한 상품: ${userInfo.liked.length}개
- 위치: ${userInfo.location ? `${userInfo.location.lat}, ${userInfo.location.lng}` : "정보 없음"}
- 선호 카테고리: ${userInfo.categories.length > 0 ? userInfo.categories.join(", ") : "없음"}

### 후보 상품들 (${candidateInfo.length}개):
${JSON.stringify(candidateInfo.slice(0, 50), null, 2)}${candidateInfo.length > 50 ? `\n... 외 ${candidateInfo.length - 50}개` : ""}

### 추천 기준 (가중치):
1) 사용자 관심사와 카테고리 매칭 (30%)
2) 최근 본 상품과의 유사도 (20%)
3) 태그/설명/이미지의 의미적 유사도 (15%)
4) 거리 (가까울수록 가중치 ↑) (15%)
5) AI 종합 등급이 높을수록 우선 (10%)
6) 가격 적정성 (5%)
7) 구성품 충실도 (3%)
8) 사기 위험도 낮은 상품 우선 (2%)

### 출력 형식(JSON only):
{
  "feed": [
    { "id": "상품ID1", "score": 0.0~1.0 },
    { "id": "상품ID2", "score": 0.0~1.0 },
    ...
  ]
}

조건:
- feed 배열에는 상위 30개만 포함 (score 높은 순)
- score는 0.0~1.0 사이 숫자
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 AI 추천 엔진입니다. 사용자 맞춤 상품을 정확하게 추천합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 2000,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 추천 피드 결과:", aiText.substring(0, 300));

        // JSON 파싱
        let result: { feed: Array<{ id: string; score: number }> };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // feed 검증 및 정규화
          const feed = Array.isArray(parsed.feed)
            ? parsed.feed
                .map((item: any) => {
                  if (!item.id || typeof item.id !== "string") return null;
                  const score = typeof item.score === "number" ? Math.max(0, Math.min(1, item.score)) : 0.5;
                  return { id: item.id, score };
                })
                .filter((item: any): item is { id: string; score: number } => item !== null)
                .sort((a, b) => b.score - a.score) // 점수 높은 순
                .slice(0, 30) // 상위 30개
            : [];

          result = { feed };
          logger.info("✅ AI 추천 피드 완료:", { count: feed.length });
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 추천 (최신순)
          result = {
            feed: candidates.slice(0, 30).map((c: any) => ({
              id: c.id || "",
              score: 0.5,
            })),
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 추천 피드 오류:", aiError);
        // Fallback: 기본 추천 (최신순)
        res.json({
          feed: candidates.slice(0, 30).map((c: any) => ({
            id: c.id || "",
            score: 0.5,
          })),
        });
      }
    } catch (e: any) {
      logger.error("🔥 추천 피드 서버 오류:", e);
      res.status(500).json({ feed: [] });
    }
  }
);


