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
 * Step 6: AI 이미지 + 음성 결합 상품 등록 함수
 * 이미지 Vision 분석 + 음성 NLU 분석을 통합하여 상품 정보를 추출하고 Firestore에 저장
 */
export const voiceVisionAddProduct = onRequest(
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

      const { imageUrl, voiceText } = req.body;

      if (!imageUrl || !voiceText) {
        res.status(400).json({ error: "imageUrl and voiceText required" });
        return;
      }

      logger.info("📸🎙️ 이미지 + 음성 분석 시작:", { imageUrl, voiceText });

      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음. 시뮬레이션 모드로 동작");
        
        // 시뮬레이션 응답
        const product = {
          name: "나이키 축구화",
          category: "축구",
          price: "₩87,000",
          desc: "중고 상품",
          aiTags: ["운동화", "축구", "나이키"],
        };

        return res.json({
          product,
          mode: "simulation",
        });
      }

      try {
        // 1️⃣ 이미지 분석 (Vision 모델)
        logger.info("🔍 이미지 분석 시작");
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "다음 스포츠용품 이미지를 분석해서 다음 정보를 JSON 형식으로 추출해줘:\n- 상품 종류 (예: 축구화, 농구공, 테니스 라켓)\n- 브랜드 (가능한 경우)\n- 예상 가격 범위 (중고 시장 기준)\n- 상태 (새상품/중고)\n- 태그 배열 (예: [\"축구화\", \"나이키\", \"프로용\"])\n\n반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        const visionText = visionResponse.choices[0]?.message?.content || "";
        logger.info("📸 이미지 분석 결과:", visionText);

        // 2️⃣ 음성 NLU + 이미지 결과 통합
        logger.info("🧠 음성 NLU + 이미지 통합 분석 시작");
        const prompt = `다음 이미지 분석 결과와 음성 입력을 통합해서 상품 정보를 JSON으로 만들어줘.

이미지 분석 결과:
${visionText}

음성 입력:
${voiceText}

중요:
- 음성 입력의 가격 정보를 우선적으로 사용 (예: "8만7천원" → 87000)
- 음성 입력의 상품명을 우선적으로 사용
- 이미지 분석 결과의 카테고리와 태그를 활용
- price는 숫자만 추출하고 "₩"와 쉼표를 포함한 형식으로 변환 (예: 87000 → "₩87,000")
- category는 "축구", "농구", "테니스", "배드민턴", "러닝" 등 스포츠 카테고리로 분류
- desc는 "중고", "새상품", "양호", "좋음" 등의 상태 정보 포함

출력 예시:
{
  "name": "나이키 머큐리얼 축구화",
  "category": "축구",
  "price": "₩87,000",
  "desc": "중고 상품, 상태 좋음",
  "aiTags": ["운동화", "축구", "나이키", "머큐리얼"]
}

반드시 JSON 형식만 반환하고, 다른 설명은 포함하지 마세요.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 스포츠용품 마켓 전문가입니다. 이미지 분석 결과와 음성 입력을 통합하여 정확한 상품 정보를 JSON 형식으로 추출합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 400,
        });

        const jsonText = aiResponse.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 통합 분석 결과:", jsonText);

        // JSON 파싱
        let product;
        try {
          // JSON 코드 블록이 있는 경우 추출
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            product = JSON.parse(jsonMatch[0]);
          } else {
            product = JSON.parse(jsonText);
          }
        } catch (parseError) {
          logger.error("❌ JSON 파싱 실패:", parseError);
          
          // 이미지 분석 결과에서 직접 추출 시도
          try {
            const visionJsonMatch = visionText.match(/\{[\s\S]*\}/);
            if (visionJsonMatch) {
              product = JSON.parse(visionJsonMatch[0]);
            } else {
              throw new Error("파싱 실패");
            }
          } catch {
            // 최종 Fallback
            product = {
              name: voiceText.split(" ")[0] + " 상품",
              category: "스포츠용품",
              price: "₩0",
              desc: voiceText,
              aiTags: ["스포츠", "용품"],
            };
          }
        }

        // 필수 필드 확인 및 기본값 설정
        const finalProduct = {
          name: product.name || "상품명 없음",
          category: product.category || "스포츠용품",
          price: product.price || "₩0",
          desc: product.desc || voiceText,
          aiTags: product.aiTags || ["스포츠", "용품"],
        };

        logger.info("✅ 최종 상품 정보:", finalProduct);

        res.json({
          product: finalProduct,
          mode: "openai",
          visionAnalysis: visionText.substring(0, 200), // 디버깅용 일부만 반환
        });
      } catch (openaiError: any) {
        logger.error("❌ OpenAI API 오류:", openaiError);
        
        // OpenAI 오류 시 기본값 반환
        const fallbackProduct = {
          name: voiceText.split(" ")[0] + " 상품",
          category: "스포츠용품",
          price: "₩0",
          desc: voiceText,
          aiTags: ["스포츠", "용품"],
        };

        res.json({
          product: fallbackProduct,
          mode: "fallback",
          error: openaiError.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 이미지+음성 통합 분석 함수 오류:", error);
      res.status(500).json({
        error: "AI 통합 분석 실패",
        message: error.message,
      });
    }
  }
);

