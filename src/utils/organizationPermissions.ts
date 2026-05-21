/**
 * 🔥 Organization 기반 권한 체크 유틸
 * 
 * 역할:
 * - Organization별 역할 기반 권한 체크
 * - users/{uid}.organizationRoles 기준
 * - Event/Stats 관리 권한 체크
 */

import type { UserProfile } from "@/types/user";

export type OrganizationRole = "super_admin" | "org_admin" | "event_manager" | "stats_manager" | "viewer";

/**
 * Organization 역할 확인
 */
export function getOrganizationRole(
  profile: UserProfile | null,
  organizationId: string
): OrganizationRole | null {
  if (!profile) return null;

  // Super Admin은 모든 조직에 접근 가능
  if (profile.role?.toUpperCase() === "ADMIN") {
    return "super_admin";
  }

  // Organization별 역할 확인
  const orgRoles = profile.organizationRoles || {};
  return (orgRoles[organizationId] as OrganizationRole) || null;
}

/**
 * Organization 관리 권한 확인
 */
export function canManageOrganization(
  profile: UserProfile | null,
  organizationId: string
): boolean {
  const role = getOrganizationRole(profile, organizationId);
  return role === "super_admin" || role === "org_admin";
}

/**
 * Event 관리 권한 확인
 */
export function canManageEvent(
  profile: UserProfile | null,
  organizationId: string
): boolean {
  const role = getOrganizationRole(profile, organizationId);
  return (
    role === "super_admin" ||
    role === "org_admin" ||
    role === "event_manager"
  );
}

/**
 * Stats 관리 권한 확인
 */
export function canManageStats(
  profile: UserProfile | null,
  organizationId: string
): boolean {
  const role = getOrganizationRole(profile, organizationId);
  return (
    role === "super_admin" ||
    role === "org_admin" ||
    role === "event_manager" ||
    role === "stats_manager"
  );
}

/**
 * 조회 권한 확인
 */
export function canView(
  profile: UserProfile | null,
  organizationId: string
): boolean {
  const role = getOrganizationRole(profile, organizationId);
  return role !== null;
}
