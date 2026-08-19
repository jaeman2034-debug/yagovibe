/**
 * P0 constitutional locks — code anchors for guards & imports.
 * @see .cursor/rules/yago-p0-constitutional-locks.mdc
 * @see docs/YAGO_ARCHITECTURE_CONSTITUTION.md ARTICLE 15–17
 */

/** Canonical URL roots for new P0 work */
export const CANONICAL_URL_ROOTS = [
  "/hub",
  "/sports",
  "/team",
  "/game",
  "/profile",
  "/market",
  "/events",
] as const;

/** Legacy — redirect or placeholder only */
export const LEGACY_URL_ROOTS = ["/sports-hub", "/academy"] as const;

/** Must not appear as new Route paths during P0 */
export const FORBIDDEN_NEW_URL_ROOTS = [
  "/academy-app",
  "/parent",
  "/player",
  "/coach-ai",
  "/yago-agent",
] as const;

/** Persisted on `teams.type` (SoT). `organizationType` field = compat alias, same value. */
export const TEAM_ORGANIZATION_TYPES = ["normal", "academy"] as const;
export type TeamOrganizationType = (typeof TEAM_ORGANIZATION_TYPES)[number];

/** @deprecated Use TEAM_ORGANIZATION_TYPES — read teams.type in Firestore */
export const ORGANIZATION_TYPES = ["club", "normal", "academy", "federation"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

/** Root collections forbidden as new SoT */
export const FORBIDDEN_ROOT_COLLECTIONS = [
  "academies",
  "academyMembers",
  "players",
  "parentLinks",
  "coachAssignments",
] as const;

/** Canonical write targets for membership & player intelligence */
export const DATA_SOT = {
  org: "teams/{teamId}",
  membership: "teams/{teamId}/members/{uid}",
  user: "users/{uid}",
  playerProfile: "playerProfiles/{uid}",
  avatar: "avatars/{uid}",
} as const;

/** Team-scoped paths allowed via CF only (not new client SoT) */
export const TEAM_SCOPED_CF_PATHS = [
  "teams/{teamId}/parentLinks/{linkId}",
  "teams/{teamId}/players/{playerId}",
  "teams/{teamId}/academyPlayers/{playerId}",
] as const;

export const PERSONA_ROLES = [
  "owner",
  "manager",
  "staff",
  "coach",
  "parent",
  "player",
  "member",
] as const;
