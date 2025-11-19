import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
 * Step 5: AI 음성 상품 등록 함수
 * 음성 텍스트를 받아서 OpenAI로 NLU 분석 후 Firestore에 자동 저장
 */
export const voiceAddProduct = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
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

      const { text } = req.body;

      if (!text) {
        res.status(400).json({ error: "No text provided" });
        return;
      }

      logger.info("🎙️ 음성 텍스트 수신:", text);

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 시뮬레이션 모드로 동작");
        
        // 시뮬레이션 응답
        const productData = {
          name: "나이키 축구화",
          category: "축구",
          price: "₩87,000",
          desc: "중고 상품",
        };

        await db.collection("marketProducts").add({
          ...productData,
          createdAt: Timestamp.now(),
        });

        return res.json({
          message: "AI가 상품을 등록했습니다 ✅ (시뮬레이션)",
          product: productData,
          mode: "simulation",
        });
      }

      // 🔹 OpenAI로 상품 정보 추출
      const prompt = `다음 문장을 분석해서 JSON으로 상품 정보를 추출해줘.
예: "축구화 등록해줘, 중고 나이키 머큐리얼, 8만7천원"

출력 예시:
{
  "name": "나이키 머큐리얼 축구화",
  "category": "축구",
  "price": "₩87,000",
  "desc": "중고 상품, 상태 양호"
}

중요:
- price는 숫자만 추출하고 "₩"와 쉼표를 포함한 형식으로 변환 (예: 87000 → "₩87,000")
- category는 "축구", "농구", "테니스", "배드민턴", "러닝" 등 스포츠 카테고리로 분류
- desc는 "중고", "새상품", "양호", "좋음" 등의 상태 정보 포함

문장: ${text}

반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.`;

      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 스포츠용품 마켓 전문가입니다. 사용자의 음성 명령을 분석하여 상품 정보를 JSON 형식으로 정확히 추출합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        });

        const jsonText = aiResponse.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 OpenAI 응답:", jsonText);

        // JSON 파싱
        let productData;
        try {
          // JSON 코드 블록이 있는 경우 추출
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            productData = JSON.parse(jsonMatch[0]);
          } else {
            productData = JSON.parse(jsonText);
          }
        } catch (parseError) {
          logger.error("❌ JSON 파싱 실패:", parseError);
          throw new Error("AI 응답 파싱 실패");
        }

        // 필수 필드 확인 및 기본값 설정
        const finalProductData = {
          name: productData.name || "상품명 없음",
          category: productData.category || "스포츠용품",
          price: productData.price || "₩0",
          desc: productData.desc || text, // 설명이 없으면 원본 텍스트 사용
          createdAt: Timestamp.now(),
        };

        // Firestore에 저장
        const docRef = await db.collection("marketProducts").add(finalProductData);

        logger.info("✅ 상품 저장 완료:", docRef.id);

        res.json({
          message: "AI가 상품을 등록했습니다 ✅",
          product: finalProductData,
          productId: docRef.id,
          mode: "openai",
        });
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        
        // OpenAI 오류 시 기본값으로 저장
        const fallbackProductData = {
          name: text.split(" ")[0] + " 상품",
          category: "스포츠용품",
          price: "₩0",
          desc: text,
          createdAt: Timestamp.now(),
        };

        const docRef = await db.collection("marketProducts").add(fallbackProductData);

        res.json({
          message: "상품이 등록되었습니다 (기본 정보로 저장됨)",
          product: fallbackProductData,
          productId: docRef.id,
          mode: "fallback",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 음성 상품 등록 함수 오류:", error);
      res.status(500).json({
        error: "음성 상품 등록 실패",
        message: error.message,
      });
    }
  }
);

