/**
 * AI Callable 얇은 래퍼 — index.ts가 무거운 impl·lib/ai·openai를
 * 배포/에뮬 "코드 로드" 단계에서 끌어오지 않도록 동적 import만 사용.
 */
import { onCall } from "firebase-functions/v2/https";

const aiCallableOpts = {
  region: "asia-northeast3" as const,
  secrets: ["OPENAI_API_KEY"],
};

export const generateAI = onCall(aiCallableOpts, async (request) => {
  const { handleGenerateAI } = await import("./generateAI.impl");
  return handleGenerateAI(request);
});

export const generateVoiceAI = onCall(aiCallableOpts, async (request) => {
  const { handleGenerateVoiceAI } = await import("./generateVoiceAI.impl");
  return handleGenerateVoiceAI(request);
});

export const generateNLU = onCall(aiCallableOpts, async (request) => {
  const { handleGenerateNLU } = await import("./generateNLU.impl");
  return handleGenerateNLU(request);
});
