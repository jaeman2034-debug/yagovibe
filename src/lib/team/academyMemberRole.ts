/**
 * Phase A A2-1 — Canonical team membership roles (platform constitution).
 * SoT: teams/{teamId}/members/{uid}.role
 *
 * admin = legacy read alias → manager (no new writes)
 */

export const ACADEMY_MEMBER_ROLE_VALUES = [
  "owner",
  "manager",
  "staff",
  "coach",
  "parent",
  "player",
  "member",
] as const;

export type AcademyMemberRole = (typeof ACADEMY_MEMBER_ROLE_VALUES)[number];

const CANONICAL_SET = new Set<string>(ACADEMY_MEMBER_ROLE_VALUES);

/** CF-aligned staff gate for roster/parent callables */
export const TEAM_ROLES_STAFF = new Set<AcademyMemberRole>([
  "owner",
  "manager",
  "staff",
  "coach",
]);

/** A2-3 — parent invite (CF mirror); coach excluded */
export const TEAM_ROLES_PARENT_INVITE = new Set<AcademyMemberRole>([
  "owner",
  "manager",
  "staff",
]);

export function canInviteParent(role: string | undefined): boolean {
  const r = normalizeMemberRole(role);
  return TEAM_ROLES_PARENT_INVITE.has(r);
}

/** Operations admin bundle (no coach training-only distinction here) */
export function isTeamAdminBundle(role: string | undefined): boolean {
  const r = normalizeMemberRole(role);
  return r === "owner" || r === "manager" || r === "staff";
}

export function isAcademyStaffRole(role: string | undefined): boolean {
  const r = normalizeMemberRole(role);
  return r != null && TEAM_ROLES_STAFF.has(r);
}

/**
 * Normalize Firestore / UI role strings for permission checks.
 * Legacy `admin` → `manager`. Unknown → `member` (safe read default).
 */
export function normalizeMemberRole(raw: string | undefined | null): AcademyMemberRole {
  if (raw == null) return "member";
  const next = String(raw).trim().toLowerCase();
  if (!next) return "member";
  if (next === "admin") return "manager";
  if (CANONICAL_SET.has(next)) return next as AcademyMemberRole;
  return "member";
}

/** Canonical role for new Firestore writes (never emits `admin`) */
export function canonicalMemberRoleForWrite(
  raw: string | undefined | null
): AcademyMemberRole {
  const normalized = normalizeMemberRole(raw);
  return normalized;
}

export function isValidAcademyMemberRole(role: string): role is AcademyMemberRole {
  return CANONICAL_SET.has(role);
}
