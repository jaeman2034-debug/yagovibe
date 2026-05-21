/**
 * 팀 초대 공유 URL — 야고 바이브(프로덕션) 도메인 고정
 *
 * - `VITE_PUBLIC_APP_ORIGIN` 예: `https://www.yagovibe.com`(커스텀 www 연결됨) 또는 `https://yago-vibe-spt.web.app`
 *   미설정 시: 브라우저 `window.location.origin` (로컬 개발용)
 * - **카카오·복사 초대 링크**는 `getPublicAppOriginForExternalInvite()` 사용:
 *   실행 주소가 localhost 등 루프백이면 `localhost`가 아니라 아래 기본 공개 도메인으로 보냅니다(수신자가 열 수 있음).
 * - `https://yagovibe.com`(루트)만 있고 Hosting이 www만 연결된 경우 → 자동으로 `https://www.yagovibe.com`으로 바꿉니다.
 * - 카카오 피드 큰 이미지: `VITE_TEAM_INVITE_KAKAO_IMAGE` (HTTPS PNG 권장) >
 *   `/icons/icon-maskable-512.png` > `/yago-logo.svg`
 */

/** Firebase 커스텀 도메인: apex는 미연결·www만 연결된 환경에서 카카오/초대 링크가 깨지지 않게 보정 */
function normalizePublicAppOrigin(origin: string): string {
  const o = origin.trim().replace(/\/$/, "");
  if (!o) return o;
  try {
    const u = new URL(o.includes("://") ? o : `https://${o}`);
    const host = u.hostname.toLowerCase();
    if (host === "yagovibe.com") {
      u.hostname = "www.yagovibe.com";
    }
    if (u.protocol === "http:" && (host === "yagovibe.com" || host === "www.yagovibe.com")) {
      u.protocol = "https:";
    }
    return u.origin.replace(/\/$/, "");
  } catch {
    return o;
  }
}

/** 로컬 개발 주소 여부 — 카카오/문자로내면 상대방이 열 수 없음 */
function isLoopbackPublicOrigin(origin: string): boolean {
  if (!origin.trim()) return false;
  try {
    const u = new URL(origin.includes("://") ? origin : `https://${origin}`);
    const h = u.hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h.endsWith(".local") ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin);
  }
}

/**
 * 카카오·클립보드 초대 등 **외부에 나가는 링크**용 베이스 URL.
 * 루프백에서 실행 중이면 `VITE_PUBLIC_APP_ORIGIN` → 없으면 야고 바이브 기본 공개 호스트.
 */
const DEFAULT_EXTERNAL_INVITE_ORIGIN = "https://www.yagovibe.com";

export function getPublicAppOriginForExternalInvite(): string {
  const env = (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined)?.trim().replace(/\/$/, "");
  /** .env 실수로 localhost를 넣으면 카카오 수신자 전부 연결 실패 → 루프백 origin은 무시 */
  if (env && !isLoopbackPublicOrigin(env)) return normalizePublicAppOrigin(env);
  if (typeof window !== "undefined" && window.location?.origin) {
    const live = window.location.origin.replace(/\/$/, "");
    if (!isLoopbackPublicOrigin(live)) return normalizePublicAppOrigin(live);
  }
  return normalizePublicAppOrigin(DEFAULT_EXTERNAL_INVITE_ORIGIN);
}

function assertExternalUrlHasNoLoopbackHost(fullUrl: string): void {
  try {
    const u = new URL(fullUrl);
    if (isLoopbackPublicOrigin(u.origin)) {
      throw new Error(`[buildExternalUrl] 외부 URL에 사용할 수 없는 호스트입니다: ${fullUrl}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("[buildExternalUrl]")) throw e;
  }
}

/**
 * SMS·클립보드·카카오 등 **외부로 나가는 절대 URL** 단일 진입점.
 * `pathOrAbsoluteUrl`은 `/path?query=…` 형태 권장. 이미 `https://` 전체 URL이면 검증만 하고 그대로 반환.
 */
export function buildExternalUrl(pathOrAbsoluteUrl: string): string {
  const raw = pathOrAbsoluteUrl.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) {
    assertExternalUrlHasNoLoopbackHost(raw);
    return raw;
  }
  const origin = getPublicAppOriginForExternalInvite();
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const url = `${origin}${path}`;
  assertExternalUrlHasNoLoopbackHost(url);
  return url;
}

/** 현재 사이트 origin (로컬 포함). OG 외 일반 용도. */
export function getPublicAppOrigin(): string {
  const env = (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined)?.trim().replace(/\/$/, "");
  if (env) return normalizePublicAppOrigin(env);
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizePublicAppOrigin(window.location.origin.replace(/\/$/, ""));
  }
  return "";
}

/** `/invite/:id` 또는 전체 URL에서 inviteLinks 문서 id 추출 */
export function extractTeamInviteDocIdFromShareUrl(href: string): string | null {
  const t = href.trim();
  if (!t) return null;
  const m = t.match(/\/invite\/([^?#]+)/);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  if (/^[a-zA-Z0-9_-]{12,}$/.test(t)) return t;
  return null;
}

/** 초대 랜딩 절대 URL (카카오·복사 — 루프백이면 공개 도메인) */
export function absoluteTeamInviteUrl(inviteId: string): string {
  return buildExternalUrl(`/invite/${encodeURIComponent(inviteId)}`);
}

/** 복사·공유용: 어떤 형태로 들어와도 동일한 공식 초대 URL로 정규화 */
export function canonicalTeamInviteLandingUrl(inviteLinkOrId: string): string {
  const id = extractTeamInviteDocIdFromShareUrl(inviteLinkOrId);
  if (!id) return inviteLinkOrId.trim();
  return absoluteTeamInviteUrl(id);
}

/**
 * 카카오/문자 등 외부 전달 직전 URL — 어떤 경로로든 localhost·사설 IP가 남지 않게 최종 보정
 * (하단 `yago-vibe-spt` 표시는 카카오 앱 설정과 별개이며, **실제 클릭 URL**만 여기서 막습니다.)
 */
export function publicInviteLandingUrlStrict(inviteLinkOrId: string): string {
  const primary = canonicalTeamInviteLandingUrl(inviteLinkOrId);
  try {
    const u = new URL(primary);
    if (!isLoopbackPublicOrigin(u.origin)) return primary;
  } catch {
    /* 상대경로 등 */
  }
  const id =
    extractTeamInviteDocIdFromShareUrl(inviteLinkOrId) ||
    extractTeamInviteDocIdFromShareUrl(primary);
  if (id) {
    return `${normalizePublicAppOrigin(DEFAULT_EXTERNAL_INVITE_ORIGIN)}/invite/${encodeURIComponent(id)}`;
  }
  return primary;
}

/**
 * Kakao `sendDefault`의 `content.link` / `buttons[].link` 전용.
 * 초대 문서 id를 알 수 있으면 **항상** `buildExternalUrl('/invite/:id')` 한 경로만 사용한다(상대경로·localhost 잔존 방지).
 */
export function teamInviteAbsoluteUrlForKakaoShare(inviteLinkOrId: string): string {
  const id = extractTeamInviteDocIdFromShareUrl(inviteLinkOrId);
  if (id) return buildExternalUrl(`/invite/${encodeURIComponent(id)}`);
  return publicInviteLandingUrlStrict(inviteLinkOrId);
}

/** 카카오톡 피드(큰 이미지)용 — HTTPS·PNG/JPG 권장(200px 이상). SVG는 미리보기 실패 가능 */
export function teamInviteKakaoFeedImageUrl(override?: string | null): string {
  const o = override?.trim();
  if (o) return o;
  const env = (import.meta.env.VITE_TEAM_INVITE_KAKAO_IMAGE as string | undefined)?.trim();
  if (env) return env;
  return buildExternalUrl("/icons/icon-maskable-512.png");
}
