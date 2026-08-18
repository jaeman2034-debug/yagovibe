/**
 * Sprint H-1 + Sprint 2-3 — Federation membership helpers (read-only, client).
 * Canonical implementation: src/lib/federation/membershipSot.ts
 * Design: docs/YAGO_FEDERATION_MEMBERSHIP_SOT_SPRINT23.md
 */

import {
  isFederationManagerCompat,
  resolveTeamFederationId,
  type FederationAclDoc,
} from "@/lib/federation/membershipSot";

export type FederationDocLike = FederationAclDoc;

/**
 * Effective manager including editors — matches many current Rules/UI surfaces.
 * Prefer isEffectiveFederationManager (owner|admin only) for new ops gates.
 */
export function isFederationManagerOnDoc(
  doc: FederationDocLike | null | undefined,
  uid: string | null | undefined
): boolean {
  return isFederationManagerCompat(doc, uid);
}

export function readTeamFederationId(
  team: Record<string, unknown> | null | undefined
): string | null {
  return resolveTeamFederationId(team);
}

export {
  resolveFederationOperatorRole,
  isEffectiveFederationManager,
  isFederationOwner,
  canEditFederationPublicContent,
  summarizeMembershipContext,
} from "@/lib/federation/membershipSot";
