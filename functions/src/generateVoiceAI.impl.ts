/**
 * generateVoiceAI 실제 로직 (lazyCallableAI에서만 동적 import)
 */
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { runAI } from "./lib/ai";
import { logger } from "firebase-functions/v2";

type GenerateVoiceAIInput = {
  task?: "summary";
  payload?: unknown;
};

type GenerateVoiceAIOutput = {
  summary: string;
};

export async function handleGenerateVoiceAI(
  request: CallableRequest<GenerateVoiceAIInput>
): Promise<GenerateVoiceAIOutput> {
  const { task = "summary", payload } = request.data || {};
  if (task !== "summary") {
    throw new HttpsError("invalid-argument", `지원하지 않는 task: ${task}`);
  }

  const prompt =
    `다음 음성 로그 요약 데이터를 한국어로 간결하게 요약해주세요.\n` +
    `- intent별 비율\n- 많이 사용된 키워드\n- 평균 검색 결과 경향\n` +
    `출력은 일반 텍스트 3~6줄.\n\n` +
    `${JSON.stringify(payload || {}).slice(0, 8000)}`;

  try {
    const summary = await runAI(prompt, { temperature: 0.2, maxTokens: 500 });
    return { summary: summary || "요약 결과가 비어 있습니다." };
  } catch (err) {
    logger.error("[generateVoiceAI] error", { err });
    throw new HttpsError("internal", "음성 요약 생성에 실패했습니다.");
  }
}
