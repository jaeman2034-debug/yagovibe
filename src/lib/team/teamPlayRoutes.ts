/**
 * 팀 플레이 라운지 URL — `/teams/:id/play` (프리로비·HUD·모드 선택)
 * 실제 게임 씬: `@/lib/play/playEcosystemRoutes` (`/playground`, `/matchmaking`, `/game/session/:id`)
 */

/** `PLAY_PAGE_VIEW`의 `source` — 앱 내 버튼으로 들어올 때 `markTeamPlayEntryFromAppNav()` 호출 후 이동 */
export const TEAM_PLAY_PAGE_SOURCE_STORAGE_KEY = "yago_team_play_source";

export type TeamPlayPageViewSource = "create_flow" | "direct" | "tab_click";

export function markTeamPlayEntryFromAppNav(): void {
  try {
    sessionStorage.setItem(TEAM_PLAY_PAGE_SOURCE_STORAGE_KEY, "tab_click");
  } catch {
    /* ignore */
  }
}

/** `PlayActionPanel` CTA → 플레이 탭 스크롤 직후, 경기 선택 블록 하이라이트용 */
export const PLAY_TAB_CTA_SCROLL_EVENT = "yago:play-tab-cta-scroll" as const;

/** CTA 종류 — `PlayTab`에서 자동 경기 선택·포커스 분기에 사용 (현재는 둘 다 최신 완료 경기) */
export type PlayTabCtaIntent = "streak" | "mvp";

export type PlayTabCtaScrollDetail = {
  intent: PlayTabCtaIntent;
};

/** 플레이 모드 카드 → 같은 탭 내 스크롤/모달/CTA 흐름 연결 */
export const PLAY_TAB_PLAYMODE_INTENT_EVENT = "yago:play-tab-playmode-intent" as const;

export type PlayTabPlayModeIntent = "match" | "simulation" | "growth";

export type PlayTabPlayModeIntentDetail = {
  intent: PlayTabPlayModeIntent;
};

/** `PlayModeSection`이 구독 — 스크롤 후 시뮬 모달 오픈 */
export const PLAY_TAB_OPEN_SIMULATION_EVENT = "yago:play-tab-open-simulation" as const;

/**
 * 외부(홈·알림·딥링크)에서 `navigate(..., { state: buildPlayTabDeepLinkState({ ... }) })`로 진입하면
 * `PlayTab`이 1회 소비한다. `justCreatedGameId` 등 다른 `state` 키와 공존 가능.
 */
export type PlayTabDeepLinkPayload = {
  autoStart?: boolean;
  focus?: "simulation" | "growth";
};

export type WithPlayTabDeepLinkState = {
  playTabDeepLink?: PlayTabDeepLinkPayload;
};

export function buildPlayTabDeepLinkState(payload: PlayTabDeepLinkPayload): WithPlayTabDeepLinkState {
  return { playTabDeepLink: payload };
}

/** `playTabDeepLink`만 제거한 나머지 state — 소비 후 `navigate(..., { replace: true, state })`에 사용 */
export function stripPlayTabDeepLinkFromState(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== "object") return null;
  const o = { ...(state as Record<string, unknown>) };
  delete o.playTabDeepLink;
  if (Object.keys(o).length === 0) return null;
  return o;
}

function encId(teamId: string): string {
  return encodeURIComponent(teamId);
}

/** 팀 스코프 플레이 라운지 (공개 진입; 멤버 전용 액션은 페이지·서비스에서 처리) */
export function teamPlayEntryPath(teamId: string, opts?: { matchId?: string }): string {
  const id = encId(teamId);
  const base = `/teams/${id}/play`;
  const mid = opts?.matchId?.trim();
  return mid ? `${base}?matchId=${encodeURIComponent(mid)}` : base;
}

/** @alias teamPlayEntryPath */
export const teamPlayLobbyPath = teamPlayEntryPath;

/** 팀 관리 페이지 안의 플레이 탭 (팀장 전용 manage 셸) */
export function teamManagePlayPath(teamId: string, opts?: { matchId?: string }): string {
  const id = encId(teamId);
  const base = `/teams/${id}/manage?tab=play`;
  const mid = opts?.matchId?.trim();
  return mid ? `${base}&matchId=${encodeURIComponent(mid)}` : base;
}

export function isDedicatedTeamPlayPathname(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "");
  return /\/teams\/[^/]+\/play$/.test(p);
}

export function isActiveTeamMemberStatus(status: string | undefined): boolean {
  if (status === undefined || status === null || String(status).trim() === "") return true;
  return String(status).trim().toLowerCase() === "active";
}

export function isUserMemberOfTeam(
  teamMembers: Array<{ teamId: string; status?: string }>,
  teamId: string
): boolean {
  return teamMembers.some((tm) => tm.teamId === teamId && isActiveTeamMemberStatus(tm.status));
}
