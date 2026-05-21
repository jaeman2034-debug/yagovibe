/**
 * generateAI 실제 로직 (lazyCallableAI에서만 동적 import)
 */
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { runAI } from "./lib/ai";
import { logger } from "firebase-functions/v2";

export async function handleGenerateAI(
  request: CallableRequest
): Promise<{ result: string }> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { type, payload } = (request.data || {}) as {
    type?: string;
    payload?: { text?: string; [key: string]: unknown };
  };

  if (!type || !payload) {
    throw new HttpsError("invalid-argument", "type과 payload가 필요합니다.");
  }

  let prompt = "";

  switch (type) {
    case "report":
      prompt = `다음 데이터를 바탕으로 한국어 주간 리포트를 작성해주세요:\n\n${JSON.stringify(payload).slice(0, 6000)}`;
      break;
    case "insight":
      prompt =
        `다음 로그 데이터를 분석하여 인사이트를 제공해주세요.\n` +
        `반드시 JSON 형식으로만 출력하세요:\n` +
        `{\n  "title": "...",\n  "bullets": ["...", "..."],\n  "actions": ["...", "..."]\n}\n\n` +
        `${JSON.stringify(payload).slice(0, 6000)}`;
      break;
    default:
      throw new HttpsError("invalid-argument", `지원하지 않는 type: ${type}`);
  }

  logger.info("[generateAI] start", { type, uid: request.auth.uid });

  try {
    const result = await runAI(prompt);
    logger.info("[generateAI] success", { type, resultLen: result?.length ?? 0 });
    return { result };
  } catch (err: unknown) {
    logger.error("[generateAI] error", { type, error: err });
    throw new HttpsError("internal", "AI 생성에 실패했습니다.");
  }
}
