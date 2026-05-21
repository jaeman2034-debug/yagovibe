/**
 * 플랫폼 권한 단일 판정 (React ↔ Firestore Rules ↔ Functions `assertPlatformAdmin` 기준 정렬).
 *
 * 저장값(권장):
 * - Firestore `users.role`: `ADMIN` | `USER`
 * - Custom Claims `role`: `admin` | `manager` | `viewer` (포털·클레임 확장)
 * - 전역 운영: `admin: true` 클레임 또는 위 `ADMIN` 귀결
 *
 * 대소문자 혼용은 이 모듈의 정규화에서만 허용한다.
 */

export type PortalRole = "admin" | "manager" | "viewer" | "guest";

export type PlatformAuthSnapshot = {
  uid: string | null;
  tokenAdmin: boolean;
  tokenRole: string | null;
  firestoreRole: string | null;
};

export function normalizeRole(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t.toUpperCase() : null;
}

export function isPlatformAdminFromSnapshot(s: PlatformAuthSnapshot): boolean {
  return (
    s.tokenAdmin === true ||
    normalizeRole(s.tokenRole) === "ADMIN" ||
    normalizeRole(s.firestoreRole) === "ADMIN"
  );
}

export function resolvePortalRoleFromSnapshot(s: PlatformAuthSnapshot): PortalRole {
  if (isPlatformAdminFromSnapshot(s)) return "admin";
  const tr = (s.tokenRole ?? "").trim().toLowerCase();
  if (tr === "manager") return "manager";
  if (tr === "viewer") return "viewer";
  return "guest";
}

export function buildPlatformAuthSnapshot(
  uid: string | null,
  claims: Record<string, unknown> | undefined,
  firestoreRole: string | null
): PlatformAuthSnapshot {
  return {
    uid,
    tokenAdmin: claims?.admin === true,
    tokenRole: typeof claims?.role === "string" ? claims.role : null,
    firestoreRole,
  };
}
