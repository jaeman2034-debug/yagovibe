/**
 * P0-3 — Terminology guards (Constitution).
 * @see docs/YAGO_P0_TERMINOLOGY_GLOSSARY.md
 *
 * Three axes — never conflate:
 * - teams.type (SoT) — organizationType field is compat alias only
 * - membershipTier   → teams.membership / TeamStatus (association facility tier)
 * - personaRole      → teams/{teamId}/members/{uid}.role
 */

import { TeamStatus } from "@/types/policy";
import type { TeamMembership } from "@/lib/team/membershipConstants";
import { membershipToTeamStatus } from "@/lib/team/membershipConstants";

/** SoT values on `teams/{teamId}.type` */
export const TEAM_ORGANIZATION_TYPES = ["normal", "academy"] as const;
export type TeamOrganizationType = (typeof TEAM_ORGANIZATION_TYPES)[number];

/** @deprecated Prefer TEAM_ORGANIZATION_TYPES / teams.type */
export const ORGANIZATION_TYPES = ["normal", "academy", "club"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export function readTeamOrganizationType(
  team: { type?: string | null; organizationType?: string | null } | null | undefined,
): TeamOrganizationType | undefined {
  const raw = team?.type ?? team?.organizationType;
  if (raw === "academy" || raw === "normal") return raw;
  return undefined;
}

export function isAcademyOrganization(
  team: { type?: string | null; organizationType?: string | null } | null | undefined,
): boolean {
  return readTeamOrganizationType(team) === "academy";
}

/** Association / facility tier — NOT youth org type */
export function isAcademyMembershipTier(
  membership: TeamMembership | string | undefined,
): boolean {
  return membershipToTeamStatus(membership) === TeamStatus.ACADEMY;
}
