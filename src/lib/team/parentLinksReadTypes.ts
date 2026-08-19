/**
 * Phase A A2-4 — parentLinks read DTO (client PURE READ).
 */

export type ParentLinkStatus = "pending" | "active" | "revoked";

export type ParentRelation = "father" | "mother" | "guardian";

export type ParentLinkRow = {
  linkId: string;
  teamId: string;
  parentUid: string;
  playerUid: string;
  relation: ParentRelation;
  status: ParentLinkStatus;
  invitedBy?: string;
  invitedAt?: unknown;
  acceptedAt?: unknown;
  revokedAt?: unknown;
  revokedBy?: string;
};
