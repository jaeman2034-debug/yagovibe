import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  buildPlatformAuthSnapshot,
  isPlatformAdminFromSnapshot,
  resolvePortalRoleFromSnapshot,
  type PlatformAuthSnapshot,
  type PortalRole,
} from "@/lib/platformRole";

/**
 * 포털 역할 (UI 게이트). 플랫폼 관리자 여부는 `role === "admin"` 과 동일하게
 * {@link isPlatformAdminFromSnapshot} 기준과 맞춘다.
 */
export type UserRole = PortalRole;

export interface RoleCheckDebugSnapshot {
  uid: string | null;
  email: string | null;
  projectId: string | null;
  hasCurrentUser: boolean;
  cachedClaims: {
    admin: boolean | null;
    role: string | null;
  };
  forcedClaims: {
    admin: boolean | null;
    role: string | null;
    attempted: boolean;
    success: boolean;
    errorCode: string | null;
    errorMessage: string | null;
  };
  firestoreFallback: {
    attempted: boolean;
    userDocExists: boolean | null;
    role: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  };
  override: {
    enabled: boolean;
    forceAdminUid: string | null;
    matched: boolean;
  };
  /** 단일 권한 스냅샷 기준 (DEV 디버그·Rules/Functions 정합) */
  platformAuthority: {
    tokenAdmin: boolean;
    tokenRole: string | null;
    firestoreRole: string | null;
    isPlatformAdmin: boolean;
    resolvedPortalRole: PortalRole;
    source: "cached" | "forced" | "override" | "none";
  } | null;
  finalRole: UserRole;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

const defaultDebugSnapshot = (): RoleCheckDebugSnapshot => ({
  uid: null,
  email: null,
  projectId: null,
  hasCurrentUser: false,
  cachedClaims: {
    admin: null,
    role: null,
  },
  forcedClaims: {
    admin: null,
    role: null,
    attempted: false,
    success: false,
    errorCode: null,
    errorMessage: null,
  },
  firestoreFallback: {
    attempted: false,
    userDocExists: null,
    role: null,
    errorCode: null,
    errorMessage: null,
  },
  override: {
    enabled: false,
    forceAdminUid: null,
    matched: false,
  },
  platformAuthority: null,
  finalRole: "guest",
  lastErrorCode: null,
  lastErrorMessage: null,
});

let lastRoleCheckDebugSnapshot: RoleCheckDebugSnapshot = defaultDebugSnapshot();

function normalizeError(err: unknown): { code: string | null; message: string | null } {
  const anyErr = err as { code?: string; message?: string } | null;
  return {
    code: anyErr?.code ?? null,
    message: anyErr?.message ?? String(err),
  };
}

type AuthoritySource = NonNullable<RoleCheckDebugSnapshot["platformAuthority"]>["source"];

function applyAuthorityDebug(
  debug: RoleCheckDebugSnapshot,
  snap: PlatformAuthSnapshot,
  source: AuthoritySource
): PortalRole {
  const resolved = resolvePortalRoleFromSnapshot(snap);
  debug.platformAuthority = {
    tokenAdmin: snap.tokenAdmin,
    tokenRole: snap.tokenRole,
    firestoreRole: snap.firestoreRole,
    isPlatformAdmin: isPlatformAdminFromSnapshot(snap),
    resolvedPortalRole: resolved,
    source,
  };
  return resolved;
}

export function getLastRoleCheckDebugSnapshot(): RoleCheckDebugSnapshot {
  return lastRoleCheckDebugSnapshot;
}

async function loadUsersRoleField(uid: string): Promise<{ exists: boolean; role: string | null }> {
  const snap = await getDoc(doc(db, "users", uid));
  const roleValue = snap.exists() ? snap.data()?.role : null;
  return {
    exists: snap.exists(),
    role: typeof roleValue === "string" ? roleValue : null,
  };
}

/**
 * 현재 사용자 포털 역할.
 * - `users.role` 은 한 번 로드해 토큰(캐시·강제) 판정에 공통으로 사용한다.
 * - 최종 역할은 {@link resolvePortalRoleFromSnapshot} 단일 경로다.
 */
export async function checkUserRole(): Promise<UserRole> {
  const auth = getAuth();
  const user = auth.currentUser;
  const debug: RoleCheckDebugSnapshot = defaultDebugSnapshot();
  debug.uid = user?.uid ?? null;
  debug.email = user?.email ?? null;
  debug.projectId = auth.app.options.projectId ?? null;
  debug.hasCurrentUser = !!user;

  if (!user) {
    debug.finalRole = "guest";
    lastRoleCheckDebugSnapshot = debug;
    console.log("[checkUserRole] no auth user -> guest", debug);
    return debug.finalRole;
  }

  const forceAdminUid = import.meta.env.VITE_FORCE_ADMIN_UID;
  const overrideEnabled = import.meta.env.DEV && typeof forceAdminUid === "string" && forceAdminUid.length > 0;
  debug.override = {
    enabled: overrideEnabled,
    forceAdminUid: overrideEnabled ? forceAdminUid : null,
    matched: overrideEnabled && user.uid === forceAdminUid,
  };
  if (debug.override.matched) {
    debug.finalRole = "admin";
    debug.platformAuthority = {
      tokenAdmin: true,
      tokenRole: "admin",
      firestoreRole: null,
      isPlatformAdmin: true,
      resolvedPortalRole: "admin",
      source: "override",
    };
    lastRoleCheckDebugSnapshot = debug;
    console.warn("[checkUserRole] DEV override matched -> admin", debug);
    return debug.finalRole;
  }

  let firestoreRole: string | null = null;
  debug.firestoreFallback.attempted = true;
  try {
    const fs = await loadUsersRoleField(user.uid);
    debug.firestoreFallback.userDocExists = fs.exists;
    debug.firestoreFallback.role = fs.role;
    firestoreRole = fs.role;
  } catch (err) {
    const normalized = normalizeError(err);
    debug.firestoreFallback.errorCode = normalized.code;
    debug.firestoreFallback.errorMessage = normalized.message;
    debug.lastErrorCode = normalized.code;
    debug.lastErrorMessage = normalized.message;
    console.error("[checkUserRole] users.role load failed", normalized);
  }

  const tryResolveFromClaims = (
    claims: Record<string, unknown> | undefined,
    source: "cached" | "forced"
  ): UserRole | null => {
    const snap = buildPlatformAuthSnapshot(user.uid, claims, firestoreRole);
    const resolved = applyAuthorityDebug(debug, snap, source);
    debug.finalRole = resolved;
    return resolved !== "guest" ? resolved : null;
  };

  try {
    const cachedToken = await user.getIdTokenResult();
    debug.cachedClaims = {
      admin: cachedToken.claims.admin === true,
      role: typeof cachedToken.claims.role === "string" ? cachedToken.claims.role : null,
    };
    const fromCached = tryResolveFromClaims(cachedToken.claims as Record<string, unknown>, "cached");
    if (fromCached !== null) {
      lastRoleCheckDebugSnapshot = debug;
      console.log("[checkUserRole] resolved (cached token)", debug);
      return fromCached;
    }
  } catch (err) {
    const normalized = normalizeError(err);
    debug.lastErrorCode = normalized.code;
    debug.lastErrorMessage = normalized.message;
    console.warn("[checkUserRole] cached claims read failed", normalized);
  }

  debug.forcedClaims.attempted = true;
  try {
    const forcedToken = await user.getIdTokenResult(true);
    debug.forcedClaims.success = true;
    debug.forcedClaims.admin = forcedToken.claims.admin === true;
    debug.forcedClaims.role =
      typeof forcedToken.claims.role === "string" ? forcedToken.claims.role : null;
    const fromForced = tryResolveFromClaims(forcedToken.claims as Record<string, unknown>, "forced");
    if (fromForced !== null) {
      lastRoleCheckDebugSnapshot = debug;
      console.log("[checkUserRole] resolved (forced token)", debug);
      return fromForced;
    }
  } catch (err) {
    const normalized = normalizeError(err);
    debug.forcedClaims.errorCode = normalized.code;
    debug.forcedClaims.errorMessage = normalized.message;
    debug.lastErrorCode = normalized.code;
    debug.lastErrorMessage = normalized.message;
    console.error("[checkUserRole] forced claims refresh failed", normalized);
  }

  const snapOnlyFs = buildPlatformAuthSnapshot(user.uid, undefined, firestoreRole);
  const finalResolved = applyAuthorityDebug(debug, snapOnlyFs, "none");
  debug.finalRole = finalResolved;
  lastRoleCheckDebugSnapshot = debug;
  if (finalResolved !== "guest") {
    console.log("[checkUserRole] resolved (firestore-only path)", debug);
  } else {
    console.warn("[checkUserRole] fallback guest", debug);
  }
  return debug.finalRole;
}

/**
 * @deprecated 항상 `checkUserRole()` 사용을 권장. 동기 API는 신뢰하지 않음.
 */
export function getCachedUserRole(): "admin" | "manager" | "viewer" | "guest" {
  const auth = getAuth();
  if (!auth.currentUser) return "guest";
  return "guest";
}
