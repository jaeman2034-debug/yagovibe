import {
  canInviteParent,
  normalizeMemberRole,
  type AcademyMemberRole,
} from "@/lib/team/academyMemberRole";

export function canShowInviteParentCta(viewerRole: string | undefined): boolean {
  return canInviteParent(viewerRole);
}

export function canShowRoleChangeCta(
  viewerRole: string | undefined,
  targetRole: AcademyMemberRole,
  isSelf: boolean
): boolean {
  if (isSelf) return false;
  if (targetRole === "owner") return false;
  const role = normalizeMemberRole(viewerRole);
  return role === "owner" || role === "manager";
}

export function canShowRevokeLinkCta(
  viewerRole: string | undefined,
  viewerUid: string | undefined,
  parentUid: string
): boolean {
  if (!viewerUid) return false;
  if (canInviteParent(viewerRole)) return true;
  return viewerUid === parentUid;
}

export function canShowAcceptInviteCta(
  viewerRole: string | undefined,
  viewerUid: string | undefined,
  pendingParentUid: string
): boolean {
  if (!viewerUid) return false;
  return normalizeMemberRole(viewerRole) === "parent" && viewerUid === pendingParentUid;
}
