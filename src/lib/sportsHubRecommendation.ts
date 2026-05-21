/**
 * 스포츠 허브 상단 — 행동·상황 기반 단일 추천 (규칙 엔진)
 * OpenAI 호출 없이 “상황 설명 + 한 가지 행동” UX
 * + 다음 화면에서 쓸 자동화 힌트(auto) 및 세션 백업
 */

export const HUB_RECOMMENDATION_NAV_STORAGE_KEY = "yago:sportsHubRecNav:v1";
const HUB_REC_TTL_MS = 30 * 60 * 1000;

export type HubRecommendationAuto = {
  presetTeamId?: string;
  presetRegion?: string;
  openModal?: string;
  /** 매칭 글 저장 직후 호스트 팀 채팅방(오픈 매칭용) 준비 */
  createChatAfterSuccess?: boolean;
  /** 모집 완료 후 공유 유도(토스트 등) */
  generateInviteLink?: boolean;
};

export type HubRecommendationNavPayload = {
  key: string;
  reason: string;
  /** 카드/헤드용 짧은 제목 */
  label: string;
  /** 버튼 문구 */
  cta: string;
  action: string;
  auto?: HubRecommendationAuto;
};

export type SportsHubUserState = {
  hasTeam: boolean;
  /** 대표 팀 id (프리셋용) */
  primaryTeamId: string;
  /** 내가 관련된 매칭 글 수(작성 + 신청 기준 합집합) */
  matchCount: number;
  /** 마지막으로 잡힌 경기 일정·등록 시점 중 최근값 (없으면 null) */
  recentMatchDate: Date | null;
  /** 대표 팀(첫 팀) 멤버 수. -1이면 아직 집계 안 됨 */
  teamMemberCount: number;
  federationJoined: boolean;
  /** 내가 작성한 activities 피드 글 수 근사 */
  activityCount: number;
};

/** 허브 UI 분기 — 추천 엔진과 별개로 “경험 단계”만 나눔 */
export type UserStage = "NEW" | "SETUP" | "ACTIVE";

export function getUserStage(state: SportsHubUserState): UserStage {
  if (!state.hasTeam) return "NEW";
  if (state.matchCount === 0) return "SETUP";
  return "ACTIVE";
}

export type SportsHubRecommendationKind =
  | "team"
  | "match_first"
  | "match_stale"
  | "activity"
  | "recruit"
  | "federation"
  | "default";

export type SportsHubRecommendation = HubRecommendationNavPayload & {
  kind: SportsHubRecommendationKind;
};

const MS_PER_DAY = 86_400_000;

function daysSince(d: Date | null): number {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return (Date.now() - d.getTime()) / MS_PER_DAY;
}

function sportPath(sportSeg: string, tail: string): string {
  const enc = encodeURIComponent(sportSeg);
  return `/sports/${enc}${tail.startsWith("/") ? tail : `/${tail}`}`;
}

export function persistHubRecommendationNav(payload: SportsHubRecommendation): void {
  try {
    sessionStorage.setItem(
      HUB_RECOMMENDATION_NAV_STORAGE_KEY,
      JSON.stringify({ ...payload, ts: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function peekHubRecommendationNav(): SportsHubRecommendation | null {
  try {
    const raw = sessionStorage.getItem(HUB_RECOMMENDATION_NAV_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as SportsHubRecommendation & { ts?: number };
    if (typeof o.ts === "number" && Date.now() - o.ts > HUB_REC_TTL_MS) return null;
    return o;
  } catch {
    return null;
  }
}

export function clearHubRecommendationNav(): void {
  try {
    sessionStorage.removeItem(HUB_RECOMMENDATION_NAV_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 우선순위: 팀 없음 → 경기 없음 → 오래됨 → 활동 없음 → 팀원 부족 → 협회 미연결 → 기본
 */
export function getRecommendation(
  state: SportsHubUserState,
  sportSeg: string
): SportsHubRecommendation {
  const teamCreate = sportPath(sportSeg, "/team/create");
  const matchCreate = sportPath(sportSeg, "/match/create");
  const recruitCreate = sportPath(sportSeg, "/recruit/create");
  const presetTeam = state.primaryTeamId.trim() || undefined;

  if (!state.hasTeam) {
    return {
      kind: "team",
      key: "create-team",
      reason: "아직 팀이 없어요. 지금 팀을 만들어보세요.",
      label: "내 팀 만들기",
      cta: "팀 만들기",
      action: teamCreate,
      auto: {
        openModal: "team-create-guide",
      },
    };
  }

  if (state.matchCount === 0) {
    return {
      kind: "match_first",
      key: "create-first-match",
      reason: "아직 등록된 경기가 없어요. 첫 경기를 만들어보세요.",
      label: "첫 경기 만들어보기",
      cta: "경기 만들기",
      action: matchCreate,
      auto: {
        presetTeamId: presetTeam,
        createChatAfterSuccess: true,
      },
    };
  }

  if (
    state.matchCount > 0 &&
    state.recentMatchDate != null &&
    daysSince(state.recentMatchDate) > 7
  ) {
    return {
      kind: "match_stale",
      key: "resume-match",
      reason: "일주일 넘게 새 경기를 등록하지 않았어요. 다시 일정을 잡아볼까요?",
      label: "경기 등록하기",
      cta: "다시 경기 만들기",
      action: matchCreate,
      auto: {
        presetTeamId: presetTeam,
        createChatAfterSuccess: true,
      },
    };
  }

  if (state.activityCount === 0) {
    return {
      kind: "activity",
      key: "open-feed",
      reason: "최근 활동이 없어요. 피드에서 다시 시작해 볼까요?",
      label: "허브 피드 보기",
      cta: "피드 열기",
      action: "/hub",
    };
  }

  if (state.teamMemberCount >= 0 && state.teamMemberCount < 5) {
    return {
      kind: "recruit",
      key: "recruit-members",
      reason: "팀원이 부족합니다. 팀원을 모집해보세요.",
      label: "팀원 모집하기",
      cta: "팀원 모집하기",
      action: recruitCreate,
      auto: {
        presetTeamId: presetTeam,
        generateInviteLink: true,
      },
    };
  }

  if (!state.federationJoined) {
    return {
      kind: "federation",
      key: "join-federation",
      reason: "참여 가능한 협회·리그를 확인해 보세요.",
      label: "협회·경기 둘러보기",
      cta: "리그 보러가기",
      action: "/sports/match",
    };
  }

  return {
    kind: "default",
    key: "check-today-match",
    reason: "오늘의 경기와 일정을 확인해 보세요.",
    label: "오늘 경기 확인하기",
    cta: "경기 보기",
    action: "/sports/match",
  };
}
