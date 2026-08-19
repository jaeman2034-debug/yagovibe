/**
 * Phase A A2-4 — PURE READ parentLinks queries (client).
 * No writes, callables, or transactions.
 */

import { collection, getDocs } from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ParentLinkRow, ParentLinkStatus, ParentRelation } from "@/lib/team/parentLinksReadTypes";

export type { ParentLinkRow, ParentLinkStatus, ParentRelation } from "@/lib/team/parentLinksReadTypes";

const RELATIONS: ParentRelation[] = ["father", "mother", "guardian"];

function readParentUid(data: Record<string, unknown>): string {
  const v = data.parentUid ?? data.parentUserId;
  return typeof v === "string" ? v.trim() : "";
}

function readPlayerUid(data: Record<string, unknown>): string {
  const v = data.playerUid ?? data.playerUserId;
  return typeof v === "string" ? v.trim() : "";
}

export function effectiveParentLinkStatus(data: Record<string, unknown>): ParentLinkStatus {
  const s = data.status;
  if (s === "pending" || s === "active" || s === "revoked") return s;
  return "active";
}

export function mapParentLinkDocToRow(
  linkId: string,
  data: Record<string, unknown>
): ParentLinkRow {
  const relation = data.relation as ParentRelation;
  return {
    linkId,
    teamId: String(data.teamId ?? ""),
    parentUid: readParentUid(data),
    playerUid: readPlayerUid(data),
    relation: RELATIONS.includes(relation) ? relation : "guardian",
    status: effectiveParentLinkStatus(data),
    invitedBy:
      typeof data.invitedBy === "string"
        ? data.invitedBy
        : typeof data.createdBy === "string"
          ? data.createdBy
          : undefined,
    invitedAt: data.invitedAt ?? data.createdAt,
    acceptedAt: data.acceptedAt,
    revokedAt: data.revokedAt,
    revokedBy: typeof data.revokedBy === "string" ? data.revokedBy : undefined,
  };
}

function mapSnap(doc: QueryDocumentSnapshot<DocumentData>): ParentLinkRow {
  return mapParentLinkDocToRow(doc.id, doc.data() as Record<string, unknown>);
}

/** All parent links for a team (caller applies persona filter). */
export async function readParentLinksForTeam(teamId: string): Promise<ParentLinkRow[]> {
  if (!teamId.trim()) return [];
  const snap = await getDocs(collection(db, "teams", teamId, "parentLinks"));
  return snap.docs.map(mapSnap);
}

/** Active links only (badge display). */
export async function readActiveParentLinksForTeam(teamId: string): Promise<ParentLinkRow[]> {
  const rows = await readParentLinksForTeam(teamId);
  return rows.filter((r) => r.status === "active" || r.status === "pending");
}

export function countActiveLinksForPlayer(links: ParentLinkRow[], playerUid: string): number {
  return links.filter(
    (l) => l.playerUid === playerUid && (l.status === "active" || l.status === "pending")
  ).length;
}

export function countActiveLinksForParent(links: ParentLinkRow[], parentUid: string): number {
  return links.filter(
    (l) => l.parentUid === parentUid && (l.status === "active" || l.status === "pending")
  ).length;
}
