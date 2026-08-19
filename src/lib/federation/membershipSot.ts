/**
 * Sprint 2-3 — Federation Membership SoT helpers (read-only).
 * Design: docs/YAGO_FEDERATION_MEMBERSHIP_SOT_SPRINT23.md
 *
 * Layers:
 *   Identity           → users/{uid}
 *   Team Membership    → teams/{teamId}/members/{uid}
 *   Federation Operator→ federations/{slug} ACL fields (no members subcollection)
 *   Affiliation        → teams.federationId (+ compat keys)
 *
 * No migration / no client ACL writes here.
 */

import {
  normalizeMemberRole,
  type AcademyMemberRole,
} from "@/lib/team/academyMemberRole";

/** Federation operator ACL roles (not team membership roles). */
export type FederationOperatorRole = "owner" | "admin" | "editor" | "none";

/** Persona facets expressed primarily via team membership.role */
export type PlatformPersona =
  | "federation_owner"
  | "federation_admin"
  | "federation_editor"
  | "team_owner"
  | "team_manager"
  | "coach"
  | "parent"
  | "player"
  | "team_member"
  | "none";

export type FederationAclDoc = {
  ownerUid?: string | null;
  ownerId?: string | null;
  adminIds?: string[] | null;
  adminUids?: string[] | null;
  editorIds?: string[] | null;
  roles?: {
    admins?: string[] | null;
    editors?: string[] | null;
    managers?: string[] | null;
  } | null;
  admins?: Array<{ uid?: string | null }> | null;
  editors?: Array<{ uid?: string | null }> | null;
  members?: unknown;
};

function addUid(set: Set<string>, raw: unknown): void {
  if (typeof raw !== "string") return;
  const t = raw.trim();
  if (t) set.add(t);
}

function addUidList(set: Set<string>, list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const x of list) addUid(set, x);
}

function addUidObjects(set: Set<string>, list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const row of list) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      addUid(set, (row as { uid?: unknown }).uid);
    }
  }
}

export function readFederationOwnerUid(doc: FederationAclDoc | null | undefined): string | null {
  if (!doc) return null;
  const a = typeof doc.ownerUid === "string" ? doc.ownerUid.trim() : "";
  if (a) return a;
  const b = typeof doc.ownerId === "string" ? doc.ownerId.trim() : "";
  return b || null;
}

/** Canonical + compatibility admin UID set (excludes pure editors). */
export function readFederationAdminUids(doc: FederationAclDoc | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!doc) return set;
  addUidList(set, doc.roles?.admins);
  addUidList(set, doc.adminIds);
  addUidList(set, doc.adminUids);
  addUidObjects(set, doc.admins);
  return set;
}

/** Canonical + compatibility editor UID set. */
export function readFederationEditorUids(doc: FederationAclDoc | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!doc) return set;
  addUidList(set, doc.roles?.editors);
  addUidList(set, doc.editorIds);
  addUidObjects(set, doc.editors);
  return set;
}

/**
 * Resolve highest Federation operator role for uid.
 * Priority: owner > admin > editor > none
 */
export function resolveFederationOperatorRole(
  doc: FederationAclDoc | null | undefined,
  uid: string | null | undefined
): FederationOperatorRole {
  if (!doc || !uid) return "none";
  const id = uid.trim();
  if (!id) return "none";

  const owner = readFederationOwnerUid(doc);
  if (owner && owner === id) return "owner";

  if (readFederationAdminUids(doc).has(id)) return "admin";
  if (readFederationEditorUids(doc).has(id)) return "editor";
  return "none";
}

/** Ops manager: owner ∪ admins (compat included). Editors alone = false in target policy. */
export function isEffectiveFederationManager(
  doc: FederationAclDoc | null | undefined,
  uid: string | null | undefined
): boolean {
  const role = resolveFederationOperatorRole(doc, uid);
  return role === "owner" || role === "admin";
}

/** Legacy-compatible: many surfaces still treat editors as managers (Rules today). */
export function isFederationManagerCompat(
  doc: FederationAclDoc | null | undefined,
  uid: string | null | undefined
): boolean {
  const role = resolveFederationOperatorRole(doc, uid);
  return role === "owner" || role === "admin" || role === "editor";
}

export function isFederationOwner(
  doc: FederationAclDoc | null | undefined,
  uid: string | null | undefined
): boolean {
  return resolveFederationOperatorRole(doc, uid) === "owner";
}

export function canEditFederationPublicContent(
  doc: FederationAclDoc | null | undefined,
  uid: string | null | undefined
): boolean {
  const role = resolveFederationOperatorRole(doc, uid);
  return role === "owner" || role === "admin" || role === "editor";
}

/** Team → federation slug affiliation */
export function resolveTeamFederationId(
  team: Record<string, unknown> | null | undefined
): string | null {
  if (!team) return null;

  for (const key of ["federationId", "linkedFederationSlug", "federationSlug"] as const) {
    const v = team[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const meta = team.meta;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const slug = (meta as Record<string, unknown>).federationSlug;
    if (typeof slug === "string" && slug.trim()) return slug.trim();
  }

  const affiliation = team.affiliation;
  if (affiliation && typeof affiliation === "object" && !Array.isArray(affiliation)) {
    const slug = (affiliation as Record<string, unknown>).federationSlug;
    if (typeof slug === "string" && slug.trim()) return slug.trim();
  }

  return null;
}

export function isTeamAffiliatedWithFederation(
  team: Record<string, unknown> | null | undefined,
  federationSlug: string | null | undefined
): boolean {
  const slug = typeof federationSlug === "string" ? federationSlug.trim() : "";
  if (!slug) return false;
  const link = resolveTeamFederationId(team);
  return link != null && link === slug;
}

/** Re-export team role normalize — single write enum for team membership. */
export type TeamMembershipRole = AcademyMemberRole;
export { normalizeMemberRole as normalizeTeamMembershipRole };

export function mapTeamRoleToPersona(role: string | null | undefined): PlatformPersona {
  const r = normalizeMemberRole(role);
  switch (r) {
    case "owner":
      return "team_owner";
    case "manager":
    case "staff":
      return "team_manager";
    case "coach":
      return "coach";
    case "parent":
      return "parent";
    case "player":
      return "player";
    case "member":
    default:
      return "team_member";
  }
}

export function mapFederationOperatorToPersona(
  role: FederationOperatorRole
): PlatformPersona {
  switch (role) {
    case "owner":
      return "federation_owner";
    case "admin":
      return "federation_admin";
    case "editor":
      return "federation_editor";
    default:
      return "none";
  }
}

/**
 * Summarize a user's relationships for ops/debug (not a new SoT document).
 */
export function summarizeMembershipContext(input: {
  uid: string | null | undefined;
  federationDoc?: FederationAclDoc | null;
  teamMemberRole?: string | null;
  team?: Record<string, unknown> | null;
}): {
  uid: string | null;
  federationOperator: FederationOperatorRole;
  teamRole: TeamMembershipRole | null;
  teamPersona: PlatformPersona;
  federationPersona: PlatformPersona;
  federationId: string | null;
} {
  const uid = typeof input.uid === "string" && input.uid.trim() ? input.uid.trim() : null;
  const federationOperator = resolveFederationOperatorRole(input.federationDoc, uid);
  const teamRole = input.teamMemberRole != null ? normalizeMemberRole(input.teamMemberRole) : null;
  return {
    uid,
    federationOperator,
    teamRole,
    teamPersona: mapTeamRoleToPersona(input.teamMemberRole),
    federationPersona: mapFederationOperatorToPersona(federationOperator),
    federationId: resolveTeamFederationId(input.team ?? null),
  };
}
