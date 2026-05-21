import {
  isActiveTeamMemberStatus,
  isUserMemberOfTeam,
} from "@/lib/team/teamPlayRoutes";

export type TeamHubMemberRef = {
  teamId: string;
  role?: string;
  accessLevel?: string;
  status?: string;
};

/** teams 문서 필드 기준 팀장(레거시 ownerId·createdBy 포함) */
export function isTeamOwnerFromDoc(team: unknown, uid: string): boolean {
  if (!team || typeof team !== "object" || !uid.trim()) return false;
  const t = team as Record<string, unknown>;
  const owners = t.owners;
  const inOwners = Array.isArray(owners) && owners.some((o) => String(o) === String(uid));
  return (
    t.ownerUid === uid ||
    t.ownerUserId === uid ||
    t.ownerId === uid ||
    t.leaderId === uid ||
    t.createdBy === uid ||
    inOwners
  );
}

/** members SoT — 공개 허브 운영(미디어·수상·운영진 사진 등) */
export function memberCanManageTeamPublicHub(member: {
  role?: string;
  accessLevel?: string;
}): boolean {
  const role = String(member.role ?? "").toLowerCase();
  const access = String(member.accessLevel ?? "").toUpperCase();
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "staff" ||
    role === "vice" ||
    role === "vice_president" ||
    role === "senior_vice_president" ||
    role === "coach" ||
    access === "OWNER" ||
    access === "ADMIN"
  );
}

export type TeamHubPermissions = {
  isTeamOwner: boolean;
  isActiveMember: boolean;
  /** 미디어·수상·공개 허브 운영 UI */
  canManage: boolean;
  /** 갤러리 업로드(활성 팀원 + 팀장 + 운영진) */
  canUploadMedia: boolean;
};

export function resolveTeamHubPermissions(input: {
  uid?: string | null;
  team: unknown;
  teamId: string;
  teamMembers: TeamHubMemberRef[];
  myTeamsLoading?: boolean;
}): TeamHubPermissions {
  const uid = input.uid?.trim() ?? "";
  const teamId = input.teamId.trim();
  const loading = Boolean(input.myTeamsLoading);

  const isTeamOwner = Boolean(uid && input.team && isTeamOwnerFromDoc(input.team, uid));

  const isActiveMember =
    Boolean(uid) &&
    !loading &&
    teamId.length > 0 &&
    isUserMemberOfTeam(input.teamMembers, teamId);

  const memberRow = uid
    ? input.teamMembers.find(
        (m) => m.teamId === teamId && isActiveTeamMemberStatus(m.status)
      )
    : undefined;

  const canManageByMember = memberRow ? memberCanManageTeamPublicHub(memberRow) : false;

  const canManage = Boolean(uid && teamId && (isTeamOwner || canManageByMember));

  const canUploadMedia = Boolean(
    uid && teamId && (isActiveMember || isTeamOwner || canManage)
  );

  return {
    isTeamOwner,
    isActiveMember,
    canManage,
    canUploadMedia,
  };
}
