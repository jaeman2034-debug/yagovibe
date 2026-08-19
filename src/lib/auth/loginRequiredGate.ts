import { auth } from "@/lib/firebase";

export const LOGIN_REQUIRED_EVENT = "yago:login-required";

export type LoginRequiredReason =
  | "default"
  | "team_create"
  | "team_join"
  | "ai_analysis"
  | "chat"
  | "trade_create"
  | "event_create"
  | "profile";

export const LOGIN_REQUIRED_MESSAGES: Record<LoginRequiredReason, string> = {
  default: "이 기능을 사용하려면 로그인하세요.",
  team_create:
    "팀을 생성하려면 로그인이 필요합니다.\n로그인 후 팀 생성, 선수 관리,\n경기 운영 기능을 이용할 수 있습니다.",
  team_join: "팀에 가입하려면 로그인이 필요합니다.",
  ai_analysis: "AI 분석 기능은 회원 전용 기능입니다.",
  chat: "채팅을 이용하려면 로그인하세요.",
  trade_create: "상품 등록은 회원만 가능합니다.",
  event_create: "이벤트·모임·경기 글 작성은 로그인 후 이용할 수 있습니다.",
  profile: "프로필을 이용하려면 로그인이 필요합니다.",
};

export type LoginRequiredDetail = {
  returnTo?: string;
  reason?: LoginRequiredReason;
};

export type OpenLoginRequiredOptions = {
  returnTo?: string;
  reason?: LoginRequiredReason;
};

/** 정식 로그인 회원(익명 제외) */
export function isAuthenticatedMember(): boolean {
  const u = auth.currentUser;
  return !!u && !u.isAnonymous;
}

export function inferLoginRequiredReason(path: string): LoginRequiredReason {
  const p = path.split("?")[0] ?? path;
  if (p.includes("/team/create") || p === "/team/create") return "team_create";
  if (p.includes("/ai-analysis") || p.includes("/market/ai-create")) return "ai_analysis";
  if (p.startsWith("/app/chat") || p.startsWith("/chat/")) return "chat";
  if (p.includes("/market/create")) return "trade_create";
  if (p.includes("/recruit/create") || p.includes("/match/create") || p.includes("/events")) {
    return "event_create";
  }
  if (p.startsWith("/me")) return "profile";
  if (p.includes("/team/search") || p.includes("/invite")) return "team_join";
  return "default";
}

/** 보호 라우트 직접 진입 시 복귀할 공개 페이지 */
export function resolveGuestAuthFallbackPath(returnTo: string): string {
  const path = returnTo.split("?")[0] ?? returnTo;
  const sportMatch = path.match(/^\/sports\/([^/]+)/);
  if (sportMatch) {
    return `/sports/${encodeURIComponent(sportMatch[1])}`;
  }
  return "/hub";
}

export function openLoginRequiredModal(
  returnToOrOptions?: string | OpenLoginRequiredOptions
): void {
  if (typeof window === "undefined") return;
  const opts: OpenLoginRequiredOptions =
    typeof returnToOrOptions === "string"
      ? { returnTo: returnToOrOptions }
      : (returnToOrOptions ?? {});
  const returnTo =
    opts.returnTo ?? `${window.location.pathname}${window.location.search}`;
  const reason = opts.reason ?? inferLoginRequiredReason(returnTo);
  const detail: LoginRequiredDetail = { returnTo, reason };
  window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT, { detail }));
}

/** 게스트면 로그인 모달, 회원이면 action 실행 */
export function requireAuthSession(
  action: () => void,
  returnToOrOptions?: string | OpenLoginRequiredOptions
): void {
  if (isAuthenticatedMember()) {
    action();
    return;
  }
  openLoginRequiredModal(returnToOrOptions);
}
