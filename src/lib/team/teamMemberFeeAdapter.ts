/**
 * Bridge TeamMemberRow (A2-2 read DTO) → fees UI TeamMember shape.
 * Keeps fees domain type out of teamMemberRead.ts
 */

import type { TeamMember } from "@/features/fees/types";
import { normalizeMemberDuesType } from "@/types/memberDues";
import type { TeamMemberRow } from "@/lib/team/teamMemberReadTypes";

export function mapMemberRowToFeeTeamMember(row: TeamMemberRow): TeamMember {
  const data = row.raw;
  const duesRaw =
    data.duesType ??
    (typeof data.dueType === "string" ? data.dueType : undefined) ??
    data.feePlan;

  return {
    uid: row.billingUid,
    memberDocumentId: row.memberDocumentId,
    linkedAuthUid: row.linkedAuthUid,
    name: row.displayName,
    role: row.role,
    joinedAt: data.joinedAt as TeamMember["joinedAt"],
    duesType: normalizeMemberDuesType(duesRaw),
    yearlyPaidAt:
      (data.yearlyPaidAt as TeamMember["yearlyPaidAt"]) ??
      (data.annualPaidAt as TeamMember["yearlyPaidAt"]),
    discountAmount:
      typeof data.discountAmount === "number" && Number.isFinite(data.discountAmount)
        ? Math.max(0, Math.floor(data.discountAmount))
        : undefined,
    discountLabel:
      typeof data.discountLabel === "string" && data.discountLabel.trim()
        ? data.discountLabel.trim()
        : undefined,
  };
}
