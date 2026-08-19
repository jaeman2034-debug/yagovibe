import {
  isTeamAdminBundle,
  normalizeMemberRole,
  type AcademyMemberRole,
} from "@/lib/team/academyMemberRole";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";
import type { TeamMemberRow } from "@/lib/team/teamMemberRead";

export type AcademyRosterVisibility = {
  showStaff: boolean;
  showCoaches: boolean;
  showPlayers: boolean;
  showParents: boolean;
  filterPlayers: (rows: TeamMemberRow[]) => TeamMemberRow[];
  filterParents: (rows: TeamMemberRow[]) => TeamMemberRow[];
};

export function resolveAcademyRosterVisibility(
  viewerRole: AcademyMemberRole | undefined,
  viewerUid: string | undefined
): AcademyRosterVisibility {
  const role = normalizeMemberRole(viewerRole);

  if (role === "parent" && viewerUid) {
    return {
      showStaff: false,
      showCoaches: false,
      showPlayers: true,
      showParents: false,
      filterPlayers: (rows) => rows,
      filterParents: (rows) => rows,
    };
  }

  if (role === "player" || role === "member") {
    return {
      showStaff: false,
      showCoaches: false,
      showPlayers: true,
      showParents: false,
      filterPlayers: (rows) =>
        viewerUid ? rows.filter((r) => r.linkedAuthUid === viewerUid || r.billingUid === viewerUid) : [],
      filterParents: (rows) => rows,
    };
  }

  if (role === "coach") {
    return {
      showStaff: false,
      showCoaches: true,
      showPlayers: true,
      showParents: false,
      filterPlayers: (rows) => rows,
      filterParents: (rows) => rows,
    };
  }

  if (isTeamAdminBundle(role) || role === "owner" || role === "manager" || role === "staff") {
    return {
      showStaff: true,
      showCoaches: true,
      showPlayers: true,
      showParents: true,
      filterPlayers: (rows) => rows,
      filterParents: (rows) => rows,
    };
  }

  return {
    showStaff: false,
    showCoaches: false,
    showPlayers: false,
    showParents: false,
    filterPlayers: () => [],
    filterParents: () => [],
  };
}

export function filterPlayersForParentPersona(
  players: TeamMemberRow[],
  links: ParentLinkRow[],
  parentUid: string
): TeamMemberRow[] {
  const linked = new Set(
    links
      .filter((l) => l.parentUid === parentUid && l.status !== "revoked")
      .map((l) => l.playerUid)
  );
  return players.filter(
    (p) => linked.has(p.linkedAuthUid ?? "") || linked.has(p.billingUid) || linked.has(p.memberDocumentId)
  );
}
