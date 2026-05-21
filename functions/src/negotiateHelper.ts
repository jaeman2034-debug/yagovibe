import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getOpenAIClient } from "./lib/openaiClient";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

/**
 * AI 흥정 도우미 시스템
 * - 채팅 로그를 분석하여 자동 응답 초안 생성
 * - 가격 제안 추천
 * - 위험 신호 감지 (무례함, 사기 등)
 */
export const negotiateHelper = onRequest(
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
      const { history, product, userRole } = req.body;

      // userRole: "seller" | "buyer"
      if (!history || !Array.isArray(history) || history.length === 0) {
        res.status(400).json({
          reply: "",
          suggestedPrice: 0,
          risk: "low",
          riskReason: "대화 로그가 없습니다.",
          note: "",
        });
        return;
      }

      if (!product || !product.title || !product.price) {
        res.status(400).json({
          reply: "",
          suggestedPrice: 0,
          risk: "low",
          riskReason: "상품 정보가 없습니다.",
          note: "",
        });
        return;
      }

      logger.info("🧠 AI 흥정 도우미 요청:", { userRole, messageCount: history.length });

      // 최근 대화 로그만 사용 (최대 15개)
      const recentHistory = history.slice(-15).map((msg: any, idx: number) => ({
        index: idx + 1,
        role: msg.role || "unknown",
        message: typeof msg.message === "string" ? msg.message.substring(0, 500) : String(msg.message || ""),
        time: msg.time || "",
      }));

      const prompt = `
너는 중고거래 플랫폼의 "AI 흥정 도우미"야.

[상품 정보]
- 제목: ${product.title || "정보 없음"}
- 현재 가격: ${typeof product.price === "number" ? product.price.toLocaleString() + "원" : "정보 없음"}
- 카테고리: ${product.category || "정보 없음"}
- 상태: ${product.conditionLabel || product.condition || "정보 없음"}
- 요약: ${product.summary || product.aiOneLine || "정보 없음"}

[대화 로그]
아래는 가장 최근 메시지가 마지막에 오는 순서야 (시간순):
${JSON.stringify(recentHistory, null, 2)}

[사용자 역할]
사용자는 현재 ${userRole === "seller" ? "판매자" : "구매자"} 입장이야.

[너의 목표]
1. 예의 바르고, 간단하고, 한국 중고시장 분위기에 맞는 자연스러운 답장을 제안해줘.
2. 현재 가격 상황과 대화 맥락을 고려하여 "제안할 만한 적정 가격"을 추천해줘.
3. 사기나 이상한 패턴이 의심되면 위험도를 평가하고 경고 메시지를 포함해줘.
4. 사용자에게 조용히 알려줄 조언 (예: "너무 싸게 내주지 마세요", "이 가격이면 충분히 적정합니다" 등)을 제공해줘.

[주의사항]
- 답장은 한국어로, 존댓말 사용
- 이모지 사용 가능 (적당히)
- 너무 길지 않게 (2-3문장 권장)
- 자연스럽고 친절한 톤
- 가격 제안은 현실적이고 합리적으로
- 위험도 판단은 신중하게 (명백한 사기 신호가 있을 때만 high)

[JSON 출력 형식]:
{
  "reply": "상대에게 보낼 자연스러운 한글 답장 (2-3문장)",
  "suggestedPrice": 숫자 또는 0 (제안할 가격, 원 단위),
  "risk": "low" | "medium" | "high",
  "riskReason": "위험도 판단 이유를 한 문장으로",
  "note": "사용자에게 조용히 알려줄 조언 (예: 너무 싸게 내주지 마세요 등)"
}

조건:
- reply는 반드시 한글 문자열 (빈 문자열 금지)
- suggestedPrice는 0 이상의 정수 (제안할 가격이 없으면 0)
- risk는 반드시 "low", "medium", "high" 중 하나
- riskReason은 한 문장으로 간결하게
- note는 선택적 (없으면 빈 문자열)
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

      try {
        const aiResp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "당신은 중고거래 플랫폼의 AI 흥정 도우미입니다. 대화를 분석하여 적절한 답장과 가격 제안을 추천합니다.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 800,
        });

        const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
        logger.info("🤖 AI 흥정 도우미 결과:", aiText.substring(0, 200));

        // JSON 파싱
        let result: {
          reply: string;
          suggestedPrice: number;
          risk: "low" | "medium" | "high";
          riskReason: string;
          note: string;
        };

        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

          // 검증 및 정규화
          const reply = typeof parsed.reply === "string" && parsed.reply.trim().length > 0
            ? parsed.reply.trim()
            : userRole === "seller"
            ? "네, 좋은 제안 감사합니다. 조금 더 생각해보겠습니다."
            : "가격 확인 중입니다. 곧 답변 드리겠습니다.";

          const suggestedPrice = typeof parsed.suggestedPrice === "number" && parsed.suggestedPrice >= 0
            ? Math.round(parsed.suggestedPrice)
            : 0;

          const validRisks: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
          const risk: "low" | "medium" | "high" = validRisks.includes(parsed.risk)
            ? parsed.risk
            : "low";

          const riskReason = typeof parsed.riskReason === "string" && parsed.riskReason.trim().length > 0
            ? parsed.riskReason.trim()
            : "정상적인 대화입니다.";

          const note = typeof parsed.note === "string" ? parsed.note.trim() : "";

          result = {
            reply,
            suggestedPrice,
            risk,
            riskReason,
            note,
          };

          logger.info("✅ AI 흥정 도우미 완료:", result);
        } catch (parseError: any) {
          logger.error("❌ JSON 파싱 오류:", parseError);
          // Fallback: 기본 응답
          result = {
            reply: userRole === "seller"
              ? "네, 좋은 제안 감사합니다. 조금 더 생각해보겠습니다."
              : "가격 확인 중입니다. 곧 답변 드리겠습니다.",
            suggestedPrice: 0,
            risk: "low",
            riskReason: "AI 분석 실패로 기본값을 제공합니다.",
            note: "",
          };
        }

        res.json(result);
      } catch (aiError: any) {
        logger.error("❌ AI 흥정 도우미 오류:", aiError);
        // Fallback: 기본 응답
        res.json({
          reply: userRole === "seller"
            ? "네, 좋은 제안 감사합니다. 조금 더 생각해보겠습니다."
            : "가격 확인 중입니다. 곧 답변 드리겠습니다.",
          suggestedPrice: 0,
          risk: "low",
          riskReason: "AI 분석 서버 오류",
          note: "",
        });
      }
    } catch (e: any) {
      logger.error("🔥 흥정 도우미 서버 오류:", e);
      res.status(500).json({
        reply: "",
        suggestedPrice: 0,
        risk: "low",
        riskReason: "서버 오류로 분석할 수 없습니다.",
        note: "",
      });
    }
  }
);

