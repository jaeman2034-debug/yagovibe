/**
 * 협회 연혁(history) 전용 생성 (lazyFederationCallables에서만 동적 import)
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";
import { logger } from "firebase-functions/v2";
import { audienceLabel, sportLabel } from "./federationPromptLabels";

export type GenerateFederationHistoryInput = {
  name: string;
  sport?: string;
  audience?: string;
};

export type GenerateFederationHistoryResult = {
  history: string;
};

function buildHistoryPrompt(name: string, sportKo: string, audienceKo: string): string {
  return `
당신은 스포츠 협회 공식 홈페이지 콘텐츠를 작성하는 전문가입니다.

다음 정보를 바탕으로 **협회 연혁** 텍스트를 작성하세요.

- 협회 이름: ${name}
- 종목: ${sportKo}
- 주요 대상·활동 성격: ${audienceKo}

요구사항:
- 한국어, 공식적이고 신뢰감 있는 문체
- 2~3개 문단 (문단 사이 빈 줄 한 줄)
- 설립 취지·배경, 주요 활동 방향(리그·교육·지역 협력 등), 회원·지역과의 관계가 자연스럽게 드러나게
- 구체적인 연도·대회명은 가상으로 써도 됨
- 제목·따옴표 없이 **연혁 본문만** 출력

출력은 연혁 텍스트만 반환하세요. JSON·마크다운 코드블록을 사용하지 마세요.
`.trim();
}

export async function handleGenerateFederationHistory(
  request: CallableRequest<GenerateFederationHistoryInput>
): Promise<GenerateFederationHistoryResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, sport = "soccer", audience } = request.data || {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new HttpsError("invalid-argument", "협회 이름이 필요합니다.");
  }

  const prompt = buildHistoryPrompt(trimmedName, sportLabel(sport), audienceLabel(audience));

  logger.info("[generateFederationHistory] start", {
    uid: request.auth.uid,
    nameLen: trimmedName.length,
    sport,
  });

  if (!resolveOpenAIApiKey()) {
    logger.error("[generateFederationHistory] OPENAI_API_KEY missing");
    throw new HttpsError(
      "failed-precondition",
      "OpenAI API 키(OPENAI_API_KEY)가 없습니다. Firebase Console에서 시크릿을 등록하고 generateFederationHistory에 연결했는지 확인하세요. 로컬 에뮬레이터는 functions/.env 등에 키를 설정하세요."
    );
  }

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
      logger.warn("[generateFederationHistory] Empty response");
      text =
        `${trimmedName}는 지역 ${sportLabel(sport)} 인프라와 클럽·학교 네트워크를 바탕으로 설립되었습니다.\n\n` +
        `설립 이후 리그 운영과 교육 프로그램을 통해 회원 참여를 넓혀 왔으며, 지자체·지역 단체와 협력해 대회와 행사를 이어가고 있습니다.\n\n` +
        `앞으로도 공정한 경기 문화와 안전한 활동 환경을 위해 노력하겠습니다.`;
    }

    logger.info("[generateFederationHistory] success", { historyLen: text.length });
    return { history: text };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    const e = err as {
      status?: number;
      response?: { status?: number };
      code?: string;
      type?: string;
      message?: string;
    };
    const msg = (err instanceof Error ? err.message : String(err)) || "";
    const status = e?.status ?? e?.response?.status;
    logger.error("[generateFederationHistory] OpenAI/SDK error", {
      message: msg,
      code: e?.code,
      type: e?.type,
      status,
      name: err instanceof Error ? err.name : typeof err,
    });

    if (status === 401 || e?.code === "invalid_api_key") {
      throw new HttpsError(
        "failed-precondition",
        "OpenAI API 키가 유효하지 않습니다. 시크릿 값을 확인하세요."
      );
    }
    if (status === 429 || /rate_limit|quota/i.test(msg)) {
      throw new HttpsError("resource-exhausted", "요청이 많아 잠시 후 다시 시도해 주세요.");
    }
    if (/fetch failed|ECONNRESET|ETIMEDOUT|network|socket/i.test(msg)) {
      throw new HttpsError(
        "unavailable",
        "네트워크 오류로 연혁 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
    throw new HttpsError("internal", "연혁 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
