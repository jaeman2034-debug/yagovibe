/**
 * 협회장 인사말만 생성 (lazyFederationCallables에서만 동적 import)
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getOpenAIClient } from "../lib/openaiClient";
import { logger } from "firebase-functions/v2";
import { audienceLabel, sportLabel } from "./federationPromptLabels";

export type GenerateFederationIntroMessageInput = {
  name: string;
  sport?: string;
  audience?: string;
};

export type GenerateFederationIntroMessageResult = {
  introMessage: string;
};

function buildIntroPrompt(name: string, sportKo: string, audienceKo: string): string {
  return `
당신은 스포츠 협회 공식 홈페이지 콘텐츠를 작성하는 전문가입니다.

다음 정보를 바탕으로 **협회장 인사말**을 작성하세요.

- 협회 이름: ${name}
- 종목: ${sportKo}
- 홈페이지·활동 대상: ${audienceKo}

요구사항:
- 한국어, 공식적이고 신뢰감 있는 문체
- 2~3개 문단으로 구성 (문단 사이는 빈 줄 한 줄)
- 지역 공동체와의 연대, 회원 참여, 협회의 역할·비전이 자연스럽게 드러나게
- 특정 실존 인물·기관명은 가상으로 두어도 됨
- 따옴표·제목·머리말 없이 **인사말 본문만** 출력

출력은 인사말 텍스트만 반환하세요. JSON이나 마크다운 코드블록을 사용하지 마세요.
`.trim();
}

export async function handleGenerateFederationIntroMessage(
  request: CallableRequest<GenerateFederationIntroMessageInput>
): Promise<GenerateFederationIntroMessageResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, sport = "soccer", audience } = request.data || {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new HttpsError("invalid-argument", "협회 이름이 필요합니다.");
  }

  const sportKo = sportLabel(sport);
  const audienceKo = audienceLabel(audience);
  const prompt = buildIntroPrompt(trimmedName, sportKo, audienceKo);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
    });

    let text = completion.choices[0]?.message?.content?.trim() || "";
    if (text.startsWith("```")) {
      text = text
        .replace(/^```(?:\w+)?\s*\n?/, "")
        .replace(/\n?```\s*$/m, "")
        .trim();
    }
    if (!text) {
      logger.warn("[generateFederationIntroMessage] Empty response");
      text = `${trimmedName} 홈페이지를 방문해 주신 여러분께 감사드립니다.\n\n저희 협회는 ${sportKo}를 사랑하는 회원과 지역 공동체와 함께 공정하고 즐거운 경기 문화를 만들어 가겠습니다.\n\n앞으로도 많은 관심과 참여 부탁드립니다.`;
    }

    return { introMessage: text };
  } catch (err) {
    logger.error("[generateFederationIntroMessage] OpenAI error", err);
    throw new HttpsError("internal", "인사말 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
