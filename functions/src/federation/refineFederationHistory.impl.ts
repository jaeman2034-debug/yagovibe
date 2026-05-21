/**
 * 연혁 원문 정리 (lazyFederationCallables에서만 동적 import)
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getOpenAIClient } from "../lib/openaiClient";
import { logger } from "firebase-functions/v2";

const MAX_INPUT_CHARS = 18_000;

export type RefineFederationHistoryInput = {
  rawText: string;
};

export type RefineFederationHistoryResult = {
  history: string;
};

export async function handleRefineFederationHistory(
  request: CallableRequest<RefineFederationHistoryInput>
): Promise<RefineFederationHistoryResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const raw = String(request.data?.rawText || "").trim();
  if (!raw) {
    throw new HttpsError("invalid-argument", "정리할 텍스트가 없습니다.");
  }

  const clipped = raw.length > MAX_INPUT_CHARS ? raw.slice(0, MAX_INPUT_CHARS) + "\n\n[…이하 생략]" : raw;

  const prompt = `
당신은 대한민국 스포츠 협회 공식 홈페이지의 연혁 편집자입니다.

아래는 PDF·문서에서 추출된 원문입니다. 이를 **협회 연혁** 본문으로 다듬어 주세요.

요구사항:
- 한국어, 공식적이고 신뢰감 있는 문체
- 가능하면 연도·시기 순으로 정리 (연도가 없으면 논리적 순서)
- 2~4개 문단, 문단 사이는 빈 줄 한 줄
- 불필요한 표기·깨진 문자·중복 문장 제거
- 없는 사실을 지어내지 말 것. 원문에 없는 구체 대회명·수치는 만들지 말 것.
- 제목·따옴표로 감싼 제목 없이 본문만 출력

원문:
${clipped}
`.trim();

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    let text = completion.choices[0]?.message?.content?.trim() || "";
    if (text.startsWith("```")) {
      text = text
        .replace(/^```(?:\w+)?\s*\n?/, "")
        .replace(/\n?```\s*$/m, "")
        .trim();
    }
    if (!text) {
      logger.warn("[refineFederationHistory] Empty response");
      text = clipped.slice(0, 4000);
    }

    return { history: text };
  } catch (err) {
    logger.error("[refineFederationHistory] OpenAI error", err);
    throw new HttpsError("internal", "연혁 정리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
