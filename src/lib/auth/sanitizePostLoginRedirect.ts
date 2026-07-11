/**
 * 로그인 직후 `next` / `redirect` / sessionStorage 복귀값 정리.
 * 전체 URL에 localhost·사설 IP가 들어와도 SPA 안에서는 **pathname+search+hash**만 쓰도록 맞춘다.
 */

function isLoopbackLikeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
  if (h.endsWith(".local")) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/** 외부 오픈 리다이렉트 완화: 허용할 내부 경로 접두사 */
const TRUSTED_PATH_PREFIXES = [
  "/invite",
  "/hub",
  "/home",
  "/teams",
  "/federations",
  "/association",
  "/me",
  "/sports-hub",
  "/ground",
  "/profile",
  "/onboarding",
  "/join",
  "/login",
  "/qr",
  "/app",
];

function pathLooksInternal(pathWithQs: string): boolean {
  const path = pathWithQs.split("?")[0] || pathWithQs;
  return TRUSTED_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * `navigate(to)` / `<Navigate to={...}>` 에 넣을 **상대 경로**만 반환.
 * - 이미 `/...` 이면 `//` 가 아닐 때 그대로
 * - `http(s)://...` 이면 루프백·사설 호스트는 **path만**; 그 외 호스트는 현재 호스트와 같거나 신뢰 경로일 때만 path
 */
export function sanitizePostLoginRedirectTarget(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t || t.length >= 2048) return null;
  if (t.startsWith("//")) return null;

  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }

  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const path = `${u.pathname}${u.search}${u.hash}`;
  if (!path || path === "/") return null;

  if (isLoopbackLikeHost(u.hostname)) {
    return path;
  }

  if (typeof window !== "undefined") {
    try {
      const cur = window.location.hostname.toLowerCase();
      if (u.hostname.toLowerCase() === cur) return path;
    } catch {
      /* ignore */
    }
  }

  if (pathLooksInternal(path)) {
    return path;
  }

  return null;
}
