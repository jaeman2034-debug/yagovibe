/**
 * 🔥 공통 AI 유틸 (OpenAI gpt-4o-mini)
 * 프롬프트 기반 AI 호출 — 신규 통합 Functions에서 사용
 */
import { getOpenAIClient, resolveOpenAIApiKey } from "./openaiClient";
import { logger } from "firebase-functions/v2";

export async function runAI(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const apiKey = resolveOpenAIApiKey();
  if (!apiKey || !process.env.OPENAI_API_KEY) {
    logger.error("[runAI] OPENAI_API_KEY not set");
    throw new Error("OPENAI_API_KEY not set");
  }

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1000,
  });

  return res.choices?.[0]?.message?.content?.trim() ?? "";
}
