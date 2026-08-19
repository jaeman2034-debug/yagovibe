/**
 * P0-5 — Legacy mirror policy constants.
 * @see docs/YAGO_P0_LEGACY_MIRROR_POLICY.md
 */

/** Membership SoT — all new features must write here (or via CF → here). */
export const MEMBERSHIP_SOT_PATTERN = "teams/{teamId}/members/{uid}" as const;

/** Client writes forbidden (Firestore rules: write false). */
export const LEGACY_MIRROR_COLLECTIONS = [
  "team_members",
] as const;

/**
 * Files allowed to touch `team_members` mirrors until P0.5 migration.
 * CI: scripts/p0-guard.mjs — do not add paths without PO approval.
 */
export const TEAM_MEMBERS_MIRROR_WRITE_ALLOWLIST = [
  "src/lib/team/createTeamSimple.ts",
  "src/lib/team/teamLeave.ts",
  "src/lib/team/deleteTeam.ts",
  "src/lib/team/updateTeamMemberRole.ts",
  "src/services/teamMemberService.ts",
  "src/pages/team/TeamOnboarding.tsx",
  "src/pages/team/TeamManagePageNew.tsx",
  "src/components/onboarding/PostLoginGate.tsx",
] as const;

/** Root collections that must not become SoT for academy (P0-1). */
export const FORBIDDEN_ACADEMY_SOT_COLLECTIONS = ["academies"] as const;
