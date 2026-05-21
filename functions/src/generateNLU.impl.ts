/**
 * generateNLU 실제 로직 (lazyCallableAI에서만 동적 import)
 */
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { runAI } from "./lib/ai";
import { logger } from "firebase-functions/v2";

type GenerateNLUInput = {
  text: string;
  mode?: "intent" | "dialogue";
};

type GenerateNLUOutput = {
  intent?: string;
  keyword?: string;
  action?: string;
  target?: string | null;
  raw?: string;
};

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/```json/g, "").replace(/```/g, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function handleGenerateNLU(
  request: CallableRequest<GenerateNLUInput>
): Promise<GenerateNLUOutput> {
  const { text, mode = "intent" } = request.data || ({} as GenerateNLUInput);
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new HttpsError("invalid-argument", "text가 필요합니다.");
  }

  let prompt = "";
  if (mode === "dialogue") {
    prompt =
      `사용자 입력을 NLM 규격으로 분류하세요.\n` +
      `반드시 JSON만 출력:\n` +
      `{"action":"find_location|move_map|open_map|go_home|unknown","target":"문자열 또는 null"}\n\n` +
      `입력: ${trimmed}`;
  } else {
    prompt =
      `사용자 음성 명령을 분류하세요.\n` +
      `가능 intent: 지도열기, 근처검색, 위치이동, 홈이동, 미확인\n` +
      `반드시 JSON만 출력:\n` +
      `{"intent":"...", "keyword":"없으면 빈 문자열"}\n\n` +
      `입력: ${trimmed}`;
  }

  try {
    const raw = await runAI(prompt, { temperature: 0.0, maxTokens: 300 });
    const parsed = safeJsonParse(raw);
    if (mode === "dialogue") {
      return {
        action: String(parsed?.action || "unknown"),
        target: (parsed?.target as string | null | undefined) ?? null,
        raw,
      };
    }
    return {
      intent: String(parsed?.intent || "미확인"),
      keyword: String(parsed?.keyword || ""),
      raw,
    };
  } catch (err) {
    logger.error("[generateNLU] error", { err, mode });
    throw new HttpsError("internal", "NLU 분석에 실패했습니다.");
  }
}
