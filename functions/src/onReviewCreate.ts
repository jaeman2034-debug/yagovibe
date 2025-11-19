import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Step 8: 리뷰 작성 시 감정 점수 자동 분석 트리거
 * Firestore marketReviews 컬렉션에 새 문서가 생성되면 자동으로 감정 분석 수행
 */
export const onReviewCreate = onDocumentCreated(
  {
    document: "marketReviews/{reviewId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const reviewData = event.data?.data();
      const reviewId = event.params.reviewId;

      if (!reviewData || !reviewId) {
        logger.warn("⚠️ 리뷰 데이터 없음");
        return;
      }

      const reviewText = reviewData.text || "";
      if (!reviewText) {
        logger.warn("⚠️ 리뷰 텍스트 없음");
        return;
      }

      logger.info("📝 새 리뷰 생성 감지:", { reviewId, text: reviewText.substring(0, 50) });

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 기본값 사용");
        
        // 기본값 설정
        await db.collection("marketReviews").doc(reviewId).update({
          sentiment: "neutral",
          sentimentScore: 3.0,
          analyzedAt: new Date(),
        });
        return;
      }

      try {
        // 🔍 감정 분석
        const prompt = `다음 리뷰 문장의 감정을 분석해줘:

문장: "${reviewText}"

다음 정보를 JSON 형식으로 반환:
- sentiment: "positive" | "neutral" | "negative"
- sentimentScore: 1.0 ~ 5.0 사이의 숫자 (소수점 첫째자리까지)

출력 예시:
{
  "sentiment": "positive",
  "sentimentScore": 4.7
}

반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 고객 리뷰 감정 분석 전문가입니다. 리뷰 텍스트를 분석하여 정확한 감정과 점수를 제공합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });

        const jsonText = aiResponse.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 응답:", jsonText);

        // JSON 파싱
        let result;
        try {
          // JSON 코드 블록이 있는 경우 추출
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(jsonText);
          }
        } catch (parseError) {
          logger.error("❌ JSON 파싱 실패:", parseError);
          
          // Fallback: 기본값
          result = {
            sentiment: "neutral",
            sentimentScore: 3.0,
          };
        }

        // 필수 필드 확인 및 기본값 설정
        const sentiment = result.sentiment || "neutral";
        let sentimentScore = parseFloat(result.sentimentScore) || 3.0;
        
        // 점수 범위 제한 (1.0 ~ 5.0)
        sentimentScore = Math.max(1.0, Math.min(5.0, sentimentScore));

        // Firestore 업데이트
        await db.collection("marketReviews").doc(reviewId).update({
          sentiment,
          sentimentScore,
          analyzedAt: new Date(),
        });

        logger.info("✅ 감정 분석 완료:", {
          reviewId,
          sentiment,
          sentimentScore,
        });
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        
        // OpenAI 오류 시 기본값 설정
        await db.collection("marketReviews").doc(reviewId).update({
          sentiment: "neutral",
          sentimentScore: 3.0,
          analyzedAt: new Date(),
          analysisError: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 리뷰 생성 트리거 오류:", error);
    }
  }
);

