export type AssociationRole = "owner" | "admin" | "member";

export interface AssociationMember {
  uid: string;
  role: AssociationRole;
}

export interface AssociationWithMembers {
  ownerUid?: string;
  ownerId?: string;
  members?: AssociationMember[];
}

export function getUserRole(association: AssociationWithMembers | null | undefined, uid?: string | null): AssociationRole | null {
  if (!association || !uid) return null;

  const member = association.members?.find((m) => m.uid === uid);
  if (member?.role) return member.role;

  if (association.ownerUid === uid || association.ownerId === uid) {
    return "owner";
  }

  return null;
}

export function isOwner(association: AssociationWithMembers | null | undefined, uid?: string | null): boolean {
  return getUserRole(association, uid) === "owner";
}

export function isAdmin(association: AssociationWithMembers | null | undefined, uid?: string | null): boolean {
  const role = getUserRole(association, uid);
  return role === "owner" || role === "admin";
}

