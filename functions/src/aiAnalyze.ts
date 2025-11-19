import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";
import fetch from "node-fetch";

export const aiAnalyze = onRequest(async (req, res) => {
  try {
    const { imageUrl, description } = req.body as {
      imageUrl?: string;
      description?: string;
    };

    if (!imageUrl && !description) {
      res.status(400).json({ error: "imageUrl 또는 description 중 하나는 반드시 필요합니다." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다.");
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
      다음 입력을 참고해서 스포츠 중고 상품 정보를 JSON으로 만들어줘.
      - imageUrl: ${imageUrl ?? "없음"}
      - description: ${description ?? "없음"}

      반드시 아래 필드를 포함한 JSON만 응답해줘.
      {
        "category": "카테고리 텍스트",
        "tags": ["태그1", "태그2"],
        "suggestedPrice": 12345
      }
      가격은 숫자(원)로만 적고, 태그는 배열 형태로 작성해줘.
    `;

    console.log("🧠 AI 상품 분석 요청", { imageUrl, description });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 중고 스포츠 용품을 분석해서 카테고리/태그/추천가격을 JSON으로만 알려주는 도우미야.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawContent = completion.choices[0].message?.content ?? "{}";
    const cleaned = rawContent.replace(/```json|```/g, "").trim();

    let parsed: {
      category?: string;
      tags?: string[];
      suggestedPrice?: number;
    } = {};

    try {
      parsed = JSON.parse(cleaned || "{}");
    } catch (jsonError) {
      console.warn("⚠️ JSON 파싱 실패, 원본 반환", jsonError, cleaned);
    }

    const responseBody = {
      category: parsed.category || "기타",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      suggestedPrice: parsed.suggestedPrice ?? null,
      raw: rawContent,
    };

    try {
      await fetch("https://n8n.yago-vibe.ai/webhook/market-created", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          description,
          response: responseBody,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (webhookError) {
      console.warn("⚠️ n8n Webhook 전송 실패:", webhookError);
    }

    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("❌ AI 분석 오류:", error);
    res.status(500).json({ error: error.message });
  }
});
