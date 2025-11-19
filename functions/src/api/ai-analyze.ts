import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";
import fetch from "node-fetch";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const aiAnalyze = onRequest(async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: "텍스트가 필요합니다." });
      return;
    }

    console.log("🧠 AI 상품 분석 요청:", text);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 상품 등록 도우미야. 한국어로 주어진 문장을 분석해서 이름, 카테고리, 예상가격(숫자), 간단 설명을 JSON으로 만들어줘.",
        },
        { role: "user", content: text },
      ],
    });

    const result = completion.choices[0].message?.content || "";
    console.log("🧠 GPT 결과:", result);

    try {
      await fetch("https://n8n.yago-vibe.ai/webhook/market-created", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          result,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (webhookError) {
      console.warn("⚠️ n8n Webhook 전송 실패:", webhookError);
    }

    res.status(200).json({
      name: result.match(/"name": ?"([^"]+)"/)?.[1] || "AI 상품",
      category: result.match(/"category": ?"([^"]+)"/)?.[1] || "기타",
      desc: result.match(/"desc": ?"([^"]+)"/)?.[1] || text,
      price: result.match(/"price": ?"([^"]+)"/)?.[1] || "0",
    });
  } catch (error: any) {
    console.error("❌ AI 분석 오류:", error);
    res.status(500).json({ error: error.message });
  }
});
