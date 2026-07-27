/**
 * Federation / Ownership 초대 — 로그인 후에도 `/invite?token=...` 로 복귀.
 *
 * Kakao 인앱 → 로그인 → (가끔) /hub 로 떨어지는 경우에도
 * token 을 sessionStorage + localStorage 에 이중 저장해 복구한다.
 * (`?next=` 유실 대비)
 */

const PATH_KEY = "yago_pending_invite_return_v1";
/** 사용자/PM 요청 키 — raw token */
const TOKEN_KEY = "pendingInviteToken";

function normalizeInviteReturnPath(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (!v || v.length >= 2048) return null;
  if (!v.startsWith("/invite")) return null;
  if (v.startsWith("//")) return null;
  return v;
}

function normalizeToken(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (!v || v.length > 200) return null;
  if (/[\s<>"'`]/.test(v)) return null;
  return v;
}

function writeBoth(storageWrite: (storage: Storage) => void): void {
  try {
    if (typeof sessionStorage !== "undefined") storageWrite(sessionStorage);
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== "undefined") storageWrite(localStorage);
  } catch {
    /* ignore */
  }
}

function readFirst(read: (storage: Storage) => string | null): string | null {
  try {
    if (typeof sessionStorage !== "undefined") {
      const v = read(sessionStorage);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== "undefined") {
      const v = read(localStorage);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** raw token 저장 (session + local) */
export function setPendingInviteToken(token: unknown): void {
  const t = normalizeToken(token);
  if (!t) return;
  writeBoth((s) => {
    s.setItem(TOKEN_KEY, t);
    s.setItem(PATH_KEY, `/invite?token=${encodeURIComponent(t)}`);
  });
  try {
    sessionStorage.setItem("afterLogin", `/invite?token=${encodeURIComponent(t)}`);
  } catch {
    /* ignore */
  }
}

export function getPendingInviteToken(): string | null {
  return readFirst((s) => normalizeToken(s.getItem(TOKEN_KEY)));
}

/** `/invite?token=...` 또는 `/invite?id=...` 전체 경로 저장 */
export function setPendingInviteReturnPath(pathWithQs: unknown): void {
  const v = normalizeInviteReturnPath(pathWithQs);
  if (!v) return;
  writeBoth((s) => s.setItem(PATH_KEY, v));
  try {
    const u = new URL(v, "https://yago-vibe-spt.web.app");
    const token = u.searchParams.get("token");
    if (token) setPendingInviteToken(token);
  } catch {
    /* path only */
  }
  try {
    sessionStorage.setItem("afterLogin", v);
  } catch {
    /* ignore */
  }
}

/** path 우선, 없으면 token 으로 재구성 */
export function getPendingInviteReturnPath(): string | null {
  const fromPath = readFirst((s) => normalizeInviteReturnPath(s.getItem(PATH_KEY)));
  if (fromPath) return fromPath;
  const token = getPendingInviteToken();
  if (token) return `/invite?token=${encodeURIComponent(token)}`;
  return null;
}

export function clearPendingInviteReturnPath(): void {
  writeBoth((s) => {
    s.removeItem(PATH_KEY);
    s.removeItem(TOKEN_KEY);
  });
  try {
    sessionStorage.removeItem("afterLogin");
  } catch {
    /* ignore */
  }
}

/**
 * 만료/사용완료 초대에서 Hub로 탈출.
 * SPA navigate만으로는 게이트·캐시로 다시 /invite 로 끌릴 수 있어
 * storage 정리 후 hard navigation 한다.
 */
export function escapeDeadInviteToHub(): void {
  clearPendingInviteReturnPath();
  try {
    sessionStorage.removeItem("afterLogin");
    sessionStorage.removeItem("pendingInviteToken");
    localStorage.removeItem("pendingInviteToken");
    localStorage.removeItem(PATH_KEY);
    sessionStorage.removeItem(PATH_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.location.replace("/hub");
  }
}

/** URL searchParams 로부터 invite 복귀 경로 구성 + token 저장 */
export function inviteReturnPathFromSearchParams(params: URLSearchParams): string | null {
  const token = params.get("token")?.trim();
  if (token) {
    setPendingInviteToken(token);
    return `/invite?token=${encodeURIComponent(token)}`;
  }
  const id = params.get("id")?.trim();
  if (id) {
    const fid = params.get("fid")?.trim();
    const path = fid
      ? `/invite?id=${encodeURIComponent(id)}&fid=${encodeURIComponent(fid)}`
      : `/invite?id=${encodeURIComponent(id)}`;
    setPendingInviteReturnPath(path);
    return path;
  }
  return null;
}

/** 로그인 직후 복귀 대상이 invite 인지 */
export function isPendingInviteReturn(path: string | null | undefined): boolean {
  const p = normalizeInviteReturnPath(path);
  return !!p && (p.includes("token=") || p.includes("id="));
}
