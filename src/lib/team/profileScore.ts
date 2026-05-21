/**
 * 팀 공개 프로필 완성도 — 룰 기반(결정적·설명 가능).
 * 이후 proactive / 전환 분석은 suggestion.source 확장으로 연결.
 */

export type TeamProfileSuggestionSeverity = "low" | "medium" | "high";
export type TeamProfileSuggestionField = "intro" | "oneLine" | "joinMessage";

/** 이후 전환 분석·AI 제안과 합류 가능 */
export type TeamProfileSuggestionActionType = "focus" | "ai_improve" | "ai_generate";

export type TeamProfileSuggestion = {
  id: string;
  severity: TeamProfileSuggestionSeverity;
  title: string;
  description: string;
  targetField?: TeamProfileSuggestionField;
  actionLabel?: string;
  /** 없으면 targetField 있을 때 기본은 이동+포커스만 */
  actionType?: TeamProfileSuggestionActionType;
};

export type TeamProfileScoreSections = {
  basicInfo: number;
  activityClarity: number;
  recruiting: number;
  personality: number;
};

export type TeamProfileScoreResult = {
  score: number;
  sections: TeamProfileScoreSections;
  suggestions: TeamProfileSuggestion[];
};

export type TeamProfileScoreInput = {
  teamName: string;
  region: string;
  sportType: string;
  intro: string;
  /** 이런 분께 추천 — 줄바꿈으로 구분된 편집 중 텍스트 */
  oneLinesText: string;
  joinMessage: string;
  onboarding?: Record<string, unknown> | null | undefined;
  /** 회장 인사말 본문 (aiProfile v2 generated/edited.captainMessage 등) */
  captainMessage?: string;
};

const ACTIVITY_RE = /주말|평일|월요|화요|수요|목요|금요|토요|일요|연습|경기|리그|매치|친선|운동|일정|시간|저녁|오전|오후/i;
const RECRUIT_ACTION_RE = /해요|세요|오세요|참여|문의|함께|지금|연락|신청|합류|가입|뛰|놀아|와 주|와주/i;
const AUDIENCE_RE = /누구|분들|선수|회원|실력|연령|초보|입문|경험|부담|환영/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function linesFromBlock(t: string): string[] {
  return t
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function scoreBasic(input: TeamProfileScoreInput): { score: number; suggestions: TeamProfileSuggestion[] } {
  const s: TeamProfileSuggestion[] = [];
  let pts = 0;
  const nameOk = input.teamName.trim().length >= 2;
  const regionOk = input.region.trim().length > 0;
  const sportOk = input.sportType.trim().length > 0;
  const ob = input.onboarding ?? undefined;
  const mainActivity =
    ob && typeof ob.mainActivity === "string" && ob.mainActivity.trim() ? ob.mainActivity.trim() : "";
  const scheduleHint =
    Boolean(mainActivity) ||
    ACTIVITY_RE.test(input.intro) ||
    linesFromBlock(input.oneLinesText).some((l) => ACTIVITY_RE.test(l));

  if (nameOk) pts += 30;
  else {
    s.push({
      id: "basic-name",
      severity: "high",
      title: "팀 이름을 확인해 주세요",
      description: "팀 이름이 있으면 검색·초대 링크에서 훨씬 잘 알아볼 수 있어요.",
    });
  }
  if (regionOk) pts += 30;
  else {
    s.push({
      id: "basic-region",
      severity: "high",
      title: "활동 지역을 적어 보면 좋아요",
      description: "지역이 보이면 가까운 멤버가 팀 분위기를 더 쉽게 상상할 수 있어요.",
    });
  }
  if (sportOk) pts += 20;
  else {
    s.push({
      id: "basic-sport",
      severity: "medium",
      title: "종목을 알려 주면 좋아요",
      description: "어떤 스포츠인지 보이면 관심 있는 사람이 바로 맞는지 판단할 수 있어요.",
    });
  }
  if (scheduleHint) pts += 20;
  else {
    s.push({
      id: "basic-schedule",
      severity: "medium",
      title: "언제 활동하는지 한 줄만 더해 보세요",
      description: "주말·평일 등 패턴이 보이면 일정이 맞는지 빠르게 비교할 수 있어요.",
      targetField: "intro",
      actionLabel: "팀 소개로 이동",
      actionType: "ai_improve",
    });
  }
  return { score: clamp(Math.round(pts), 0, 100), suggestions: s };
}

function scoreActivity(input: TeamProfileScoreInput): { score: number; suggestions: TeamProfileSuggestion[] } {
  const s: TeamProfileSuggestion[] = [];
  const intro = input.intro.trim();
  const len = intro.length;
  let pts = 0;
  if (len >= 120) pts += 40;
  else if (len >= 60) pts += 30;
  else if (len >= 30) pts += 18;
  else if (len >= 10) pts += 8;
  else {
    s.push({
      id: "activity-intro-short",
      severity: "medium",
      title: "팀 소개를 조금만 더 채워 보면 좋아요",
      description: "활동 방식이 보이면 새 멤버가 팀 분위기를 더 잘 이해할 수 있어요.",
      targetField: "intro",
      actionLabel: "팀 소개로 이동",
      actionType: "ai_improve",
    });
  }
  if (ACTIVITY_RE.test(intro)) pts += 40;
  else if (len >= 20) {
    s.push({
      id: "activity-pattern",
      severity: "low",
      title: "언제·어떻게 뛰는지 한 줄 추가해 볼까요?",
      description: "요일·연습·경기 중 무엇을 하는지 적어 두면 매칭이 쉬워져요.",
      targetField: "intro",
      actionLabel: "팀 소개로 이동",
      actionType: "focus",
    });
    pts += 15;
  } else pts += 5;

  const ob = input.onboarding ?? undefined;
  const recruitStyle = ob && typeof ob.recruitStyle === "string" ? ob.recruitStyle : "";
  const beginnerHint =
    recruitStyle === "beginners" ||
    /초보|입문|처음|환영|부담\s*없/i.test(intro) ||
    linesFromBlock(input.oneLinesText).some((l) => /초보|입문|환영/i.test(l));
  if (beginnerHint) pts += 20;
  else if (len >= 40) {
    s.push({
      id: "activity-beginner",
      severity: "low",
      title: "누구에게 열려 있는지 적어 보면 좋아요",
      description: "초보 환영 여부 등을 알려 주면 망설이는 분이 더 편하게 문의할 수 있어요.",
      targetField: "intro",
      actionLabel: "팀 소개로 이동",
      actionType: "ai_improve",
    });
    pts += 8;
  } else pts += 4;

  return { score: clamp(Math.round(pts), 0, 100), suggestions: s };
}

function scoreRecruiting(input: TeamProfileScoreInput): { score: number; suggestions: TeamProfileSuggestion[] } {
  const s: TeamProfileSuggestion[] = [];
  const j = input.joinMessage.trim();
  const len = j.length;
  let pts = 0;
  if (len >= 80) pts += 45;
  else if (len >= 45) pts += 35;
  else if (len >= 22) pts += 22;
  else if (len >= 8) pts += 10;
  else {
    s.push({
      id: "recruit-short",
      severity: "high",
      title: "참여 문구를 조금만 더 적어 보면 좋아요",
      description: "한두 문장만 있어도 ‘어떤 행동을 하면 되는지’가 분명해져요.",
      targetField: "joinMessage",
      actionLabel: "참여 문구로 이동",
      actionType: "ai_improve",
    });
  }
  if (RECRUIT_ACTION_RE.test(j)) pts += 30;
  else if (len >= 12) {
    s.push({
      id: "recruit-cta",
      severity: "medium",
      title: "참여를 유도하는 한 마디를 더해 볼까요?",
      description: "문의·합류·함께 뛰기 등 다음 행동이 보이면 전환이 잘 나와요.",
      targetField: "joinMessage",
      actionLabel: "참여 문구로 이동",
    });
    pts += 12;
  } else pts += 5;

  if (AUDIENCE_RE.test(j)) pts += 25;
  else if (len >= 18) {
    s.push({
      id: "recruit-audience",
      severity: "low",
      title: "어떤 분을 기다리는지 한 줄이면 충분해요",
      description: "실력·연령·부담 없이 등 대상이 보이면 맞는 사람이 더 빨리 찾아와요.",
      targetField: "joinMessage",
      actionLabel: "참여 문구로 이동",
      actionType: "ai_improve",
    });
    pts += 8;
  } else pts += 4;

  return { score: clamp(Math.round(pts), 0, 100), suggestions: s };
}

function scorePersonality(input: TeamProfileScoreInput): { score: number; suggestions: TeamProfileSuggestion[] } {
  const s: TeamProfileSuggestion[] = [];
  const lines = linesFromBlock(input.oneLinesText);
  const intro = input.intro.trim();
  const ob = input.onboarding ?? undefined;
  const vibe = ob && typeof ob.vibe === "string" && ob.vibe.trim() ? ob.vibe.trim() : "";
  let pts = 0;
  if (vibe) pts += 35;
  else {
    s.push({
      id: "personality-vibe",
      severity: "low",
      title: "팀 분위기를 한 번만 더 정해 볼까요?",
      description: "브랜딩 설정의 분위기 값이 있으면 문구 톤을 맞추기 좋아요.",
    });
  }
  if (lines.length >= 3) pts += 40;
  else if (lines.length >= 2) pts += 30;
  else if (lines.length >= 1) pts += 15;
  else {
    s.push({
      id: "personality-highlights",
      severity: "medium",
      title: "‘이런 분께 추천’을 한두 줄만 적어 보면 좋아요",
      description: "맞는 사람이 스스로 ‘나다’ 싶게 느끼면 문의가 늘어나요.",
      targetField: "oneLine",
      actionLabel: "추천 항목으로 이동",
      actionType: "ai_improve",
    });
  }
  const sentences = intro.split(/[.!?\n]+/).map((x) => x.trim()).filter(Boolean);
  if (sentences.length >= 2 || intro.split(/\n/).filter((x) => x.trim()).length >= 2) pts += 25;
  else if (intro.length >= 50) pts += 12;
  else {
    s.push({
      id: "personality-flow",
      severity: "low",
      title: "소개 문장을 나누어 보면 읽기 편해져요",
      description: "짧은 문단 몇 개로 나누면 첫 방문자가 팀을 더 빨리 파악할 수 있어요.",
      targetField: "intro",
      actionLabel: "팀 소개로 이동",
      actionType: "ai_improve",
    });
    pts += 5;
  }
  return { score: clamp(Math.round(pts), 0, 100), suggestions: s };
}

function scoreTrustCaptain(input: TeamProfileScoreInput): { suggestions: TeamProfileSuggestion[] } {
  const s: TeamProfileSuggestion[] = [];
  const cm = String(input.captainMessage ?? "").trim();
  if (cm.length >= 40) return { suggestions: [] };
  s.push({
    id: "trust-captain",
    severity: "low",
    title: "회장 인사말을 추가해 보면 좋아요",
    description: "누가 팀을 운영하는지 보이면 방문자 신뢰와 가입 문의가 잘 이어져요.",
  });
  return { suggestions: s };
}

function mergeSuggestions(parts: TeamProfileSuggestion[][]): TeamProfileSuggestion[] {
  const rank: Record<TeamProfileSuggestionSeverity, number> = { high: 0, medium: 1, low: 2 };
  const flat = parts.flat();
  const seen = new Set<string>();
  const dedup: TeamProfileSuggestion[] = [];
  for (const it of flat) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    dedup.push(it);
  }
  dedup.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return dedup.slice(0, 6);
}

/**
 * 편집 중인 초안 기준으로 완성도 점수와 개선 힌트를 계산한다.
 */
export function computeTeamProfileScore(input: TeamProfileScoreInput): TeamProfileScoreResult {
  const b = scoreBasic(input);
  const a = scoreActivity(input);
  const r = scoreRecruiting(input);
  const p = scorePersonality(input);
  const t = scoreTrustCaptain(input);
  const score = clamp(Math.round((b.score + a.score + r.score + p.score) / 4), 0, 100);
  const suggestions = mergeSuggestions([b.suggestions, a.suggestions, r.suggestions, p.suggestions, t.suggestions]);
  return {
    score,
    sections: {
      basicInfo: b.score,
      activityClarity: a.score,
      recruiting: r.score,
      personality: p.score,
    },
    suggestions,
  };
}

/** 인라인 힌트: 해당 입력란에만 해당하는 제안(이미 심각도 순 정렬된 목록에서 필터) */
export function suggestionsForField(
  result: TeamProfileScoreResult | null | undefined,
  field: TeamProfileSuggestionField,
  limit = 2
): TeamProfileSuggestion[] {
  if (!result?.suggestions?.length) return [];
  return result.suggestions.filter((s) => s.targetField === field).slice(0, limit);
}
