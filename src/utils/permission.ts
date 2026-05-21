import type { AssociationMember } from "@/utils/permissions";

export interface AssociationPermissionDoc {
  ownerId?: string;
  ownerUid?: string;
  admins?: string[];
  editors?: string[];
  members?: AssociationMember[];
}

export function canEditAssociation(userId?: string | null, data?: AssociationPermissionDoc | null): boolean {
  if (!userId || !data) return false;

  if (data.ownerId === userId || data.ownerUid === userId) return true;
  if (Array.isArray(data.admins) && data.admins.includes(userId)) return true;
  if (Array.isArray(data.editors) && data.editors.includes(userId)) return true;

  const role = data.members?.find((m) => m.uid === userId)?.role;
  return role === "owner" || role === "admin";
}

