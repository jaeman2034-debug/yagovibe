/**
 * S3 — Guardian read-only selectors (pure, no I/O).
 */
import { normalizeMemberRole, type AcademyMemberRole } from "@/lib/team/academyMemberRole";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";

export function isGuardianMemberRole(role: string | undefined | null): boolean {
  return normalizeMemberRole(role) === "parent";
}

/** Fee/status display: active links only. */
export function linkedActivePlayerUidsForParent(links: ParentLinkRow[], parentUid: string): Set<string> {
  const out = new Set<string>();
  for (const l of links) {
    if (l.parentUid !== parentUid) continue;
    if (l.status !== "active") continue;
    if (l.playerUid) out.add(l.playerUid);
  }
  return out;
}

export function canViewGuardianTeamTab(
  viewerRole: AcademyMemberRole | undefined,
  links: ParentLinkRow[],
  viewerUid: string
): boolean {
  if (!isGuardianMemberRole(viewerRole) || !viewerUid.trim()) return false;
  return linkedActivePlayerUidsForParent(links, viewerUid).size > 0;
}

export function canViewChildFeeProjection(
  playerUid: string,
  links: ParentLinkRow[],
  viewerUid: string
): boolean {
  return linkedActivePlayerUidsForParent(links, viewerUid).has(playerUid);
}

export function memberMatchesLinkedPlayer(
  member: { uid?: string; linkedAuthUid?: string; memberDocumentId?: string },
  playerUid: string
): boolean {
  const keys = [member.uid, member.linkedAuthUid, member.memberDocumentId].map((k) =>
    String(k ?? "").trim()
  );
  const target = playerUid.trim();
  return keys.some((k) => k && k === target);
}
