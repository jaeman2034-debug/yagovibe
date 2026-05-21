/**
 * 협회 홈페이지 AI 콘텐츠 생성 (lazyFederationCallables에서만 동적 import)
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getOpenAIClient } from "../lib/openaiClient";
import { logger } from "firebase-functions/v2";
import { sportLabel } from "./federationPromptLabels";

export type GenerateFederationAIContentInput = {
  name: string;
  sport?: string;
  audience?: string;
};

export type GenerateFederationAIContentResult = {
  description: string;
  introMessage: string;
  history: string;
  vision: string;
  activities: string[];
  presidentName: string;
  president: { name: string; message: string };
  executives: { name: string; role: string; photo?: string }[];
  themeColor: string;
  templateType: string;
  region: string;
  organization: { summary: string };
};

type ParsedAI = Partial<GenerateFederationAIContentResult> & {
  president?: { name?: string; message?: string };
  organization?: { summary?: string };
};

function normalizeActivities(raw: ParsedAI, name: string, label: string): string[] {
  const a = raw.activities;
  if (Array.isArray(a) && a.length > 0) {
    return a
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [
    `${label} 리그 및 친선대회 운영`,
    "유·청소년 지도자·심판 교육",
    "구청·지자체와 협력한 지역 스포츠 행사",
    `${name} 소속 클럽 네트워킹`,
  ];
}

function applyFallbacks(raw: ParsedAI, name: string, sport: string): GenerateFederationAIContentResult {
  const label = sportLabel(sport);
  const introBody =
    String(raw.introMessage || "").trim() ||
    String(raw.president?.message || "").trim() ||
    "";
  const presidentName =
    String(raw.president?.name || raw.presidentName || "").trim() || "협회장 (가칭)";
  const defaultIntro =
    `${name} 공식 홈페이지를 찾아주신 여러분께 진심으로 감사드립니다.\n\n` +
    `저희 ${name}는 지역 ${label}의 건전한 경기 문화와 회원 여러분의 참여를 바탕으로, 함께 성장하는 협회를 지향합니다.\n\n` +
    `앞으로도 회원과 지역 사회에 신뢰받는 협회가 되도록 최선을 다하겠습니다.`;
  const introMessage = introBody || defaultIntro;
  const president = { name: presidentName, message: introMessage };
  const vision =
    String(raw.vision || "").trim() ||
    `${name}는 공정한 경기 문화와 지역 ${label} 저변 확대를 목표로 합니다.`;
  const activities = normalizeActivities(raw, name, label);
  const orgSummary =
    String(raw.organization?.summary || "").trim() ||
    `${name}는 회원·클럽과 함께 운영되는 ${label} 협회로, 리그 운영과 회원 서비스를 담당합니다.`;

  return {
    description: raw.description?.trim() || `${name}는 지역 ${label} 발전과 활성화를 위한 공식 협회입니다.`,
    introMessage,
    history: raw.history?.trim() || `${name}는 지역 ${label} 클럽과 시민이 함께 성장할 수 있도록 설립되었습니다.`,
    vision,
    activities,
    presidentName: president.name,
    president,
    executives: Array.isArray(raw.executives) && raw.executives.length >= 3
      ? raw.executives.slice(0, 6).map((e) => ({
          name: String(e.name || "").trim() || "임원 (가칭)",
          role: String(e.role || "").trim() || "임원",
          ...(e.photo ? { photo: e.photo } : {}),
        }))
      : [
          { name: "사무국장 (가칭)", role: "사무국장" },
          { name: "운영이사 (가칭)", role: "운영이사" },
          { name: "기획팀 (가칭)", role: "기획팀" },
        ],
    themeColor: ["green", "blue", "orange"].includes(raw.themeColor || "")
      ? raw.themeColor!
      : sport === "soccer" || sport === "football"
        ? "green"
        : "blue",
    templateType: raw.templateType?.trim() || "default",
    region: raw.region?.trim() || "지역 설정 예정",
    organization: { summary: orgSummary },
  };
}

export async function handleGenerateFederationAIContent(
  request: CallableRequest<GenerateFederationAIContentInput>
): Promise<GenerateFederationAIContentResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, sport = "soccer", audience } = request.data || {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new HttpsError("invalid-argument", "협회 이름이 필요합니다.");
  }

  const label = sportLabel(sport);
  const prompt = `
You are a system that generates a sports federation website content.
Generate realistic and professional content for a federation based on the input.
Write in Korean. Make it sound official and trustworthy. Keep it concise but meaningful.
Make it specific to the region and sport. Avoid generic phrases like "지역 발전" or "지역 스포츠 활성화".
Include realistic tone and identity that reflects the federation's actual focus.
Do NOT include explanations. Output must be valid JSON only.

Input:
- Name: ${trimmedName}
- Sport: ${label}
${audience ? `- Audience: ${audience}` : ""}

Return ONLY this JSON (no markdown, no code block):
{
  "description": "지역·종목에 맞는 구체적 소개 (예: 노원구 지역 유소년 축구 활성화, 지역 클럽 교류·리그 운영 중심)",
  "introMessage": "협회장 인사말 전문 — 한국어, 공식 톤, 2~3문단, 문단 사이 빈 줄. 지역·참여·비전 포함. (이 필드가 홈페이지 introMessage로 저장됨)",
  "history": "설립 배경·연혁 — 2~3문단, 문단 사이 빈 줄, 설립 취지·주요 활동·회원·지역과의 관계",
  "organization": {
    "summary": "조직 운영 개요 1~2문단 — 사무국·분과 역할, 리그·행사와의 관계"
  },
  "vision": "협회 비전·중장기 목표 (60~100자)",
  "activities": ["리그 운영", "교육 프로그램", "지역 행사", "심판·지도자 양성"],
  "president": {
    "name": "현실적인 한국인 이름",
    "message": "introMessage와 동일한 인사말 본문(중복 허용) 또는 생략 시 introMessage만 사용"
  },
  "executives": [
    { "name": "이름", "role": "사무국장" },
    { "name": "이름", "role": "운영이사" },
    { "name": "이름", "role": "기획팀장" }
  ],
  "themeColor": "green",
  "templateType": "default",
  "region": "지역명 (예: 서울 노원구)"
}
`.trim();

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      logger.warn("[generateFederationAIContent] Empty response");
      return applyFallbacks({}, trimmedName, sport);
    }

    const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as ParsedAI;
    return applyFallbacks(parsed, trimmedName, sport);
  } catch (err) {
    logger.error("[generateFederationAIContent] OpenAI error", err);
    return applyFallbacks({}, trimmedName, sport);
  }
}
