/**
 * Phase A A2-2 — Academy membership read DTO (NOT fees TeamMember).
 * SoT path: teams/{teamId}/members/{uid}
 */

import type { AcademyMemberRole } from "@/lib/team/academyMemberRole";

export type TeamMemberStatus = "active" | "invited" | "suspended" | "removed";

/** Read-only membership row — separate from fees-domain TeamMember UI type */
export type TeamMemberRow = {
  memberDocumentId: string;
  linkedAuthUid?: string;
  billingUid: string;
  role: AcademyMemberRole;
  status: TeamMemberStatus;
  displayName: string;
  photoUrl?: string;
  joinedAt?: unknown;
  raw: Record<string, unknown>;
};

export type ReadTeamMembersOptions = {
  /** Default: ["active"] */
  statuses?: TeamMemberStatus[];
  roles?: AcademyMemberRole[];
  /** Skip docs with isDeleted === true */
  excludeDeleted?: boolean;
};
