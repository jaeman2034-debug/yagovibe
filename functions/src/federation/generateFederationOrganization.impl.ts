/**
 * 조직 구성 생성 (lazyFederationCallables에서만 동적 import)
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getOpenAIClient } from "../lib/openaiClient";
import { logger } from "firebase-functions/v2";
import { audienceLabel, sportLabel } from "./federationPromptLabels";

export type GenerateFederationOrganizationInput = {
  name: string;
  sport?: string;
  audience?: string;
};

export type OrgExecutive = { name: string; role: string };

export type GenerateFederationOrganizationResult = {
  organization: { summary: string };
  executives: OrgExecutive[];
};

type ParsedOrg = {
  summary?: string;
  executives?: Array<{ name?: string; role?: string }>;
};

function defaultOrg(name: string, sport: string): GenerateFederationOrganizationResult {
  const label = sportLabel(sport);
  return {
    organization: {
      summary:
        `${name}는 사무국을 중심으로 대외 협력·리그 운영·회원 지원 업무를 수행합니다.\n\n` +
        `운영위원·기술·기획 등 분과가 협력하여 ${label} 종목 특성에 맞는 행사와 교육을 준비합니다.`,
    },
    executives: [
      { name: "사무국장 (가칭)", role: "사무국장" },
      { name: "운영이사 (가칭)", role: "운영이사" },
      { name: "기술위원장 (가칭)", role: "기술위원" },
      { name: "기획팀장 (가칭)", role: "기획팀" },
    ],
  };
}

function normalizeParsed(raw: ParsedOrg, name: string, sport: string): GenerateFederationOrganizationResult {
  const fallback = defaultOrg(name, sport);
  const summary = String(raw.summary || "").trim() || fallback.organization.summary;
  const ex = Array.isArray(raw.executives) ? raw.executives : [];
  const executives: OrgExecutive[] =
    ex.length > 0
      ? ex
          .slice(0, 8)
          .map((e) => ({
            name: String(e.name || "").trim() || "임원 (가칭)",
            role: String(e.role || "").trim() || "임원",
          }))
          .filter((e) => e.name || e.role)
      : fallback.executives;
  return {
    organization: { summary },
    executives: executives.length ? executives : fallback.executives,
  };
}

export async function handleGenerateFederationOrganization(
  request: CallableRequest<GenerateFederationOrganizationInput>
): Promise<GenerateFederationOrganizationResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, sport = "soccer", audience } = request.data || {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new HttpsError("invalid-argument", "협회 이름이 필요합니다.");
  }

  const label = sportLabel(sport);
  const audienceKo = audienceLabel(audience);

  const prompt = `
You output valid JSON only, no markdown, no code fence.

협회 조직 구성 콘텐츠를 한국어로 생성합니다.

입력:
- 협회 이름: ${trimmedName}
- 종목: ${label}
- 대상: ${audienceKo}

반드시 아래 JSON 형식만 출력하세요:
{
  "summary": "조직 운영 개요 1~2문단. 사무국·분과 역할, 의사결정·리그 운영과의 관계를 공식 톤으로.",
  "executives": [
    { "name": "한국인 형태 가상 이름", "role": "사무국장" },
    { "name": "...", "role": "운영이사" },
    { "name": "...", "role": "기술위원" },
    { "name": "...", "role": "기획·대외협력" }
  ]
}

executives는 4~6명, role은 한글 직책명.
`.trim();

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      logger.warn("[generateFederationOrganization] Empty response");
      return defaultOrg(trimmedName, sport);
    }

    const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as ParsedOrg;
    return normalizeParsed(parsed, trimmedName, sport);
  } catch (err) {
    logger.error("[generateFederationOrganization] error", err);
    return defaultOrg(trimmedName, sport);
  }
}
