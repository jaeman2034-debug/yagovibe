/**
 * Phase A A2-6 — read visibility selectors (no I/O).
 */
import { isTeamAdminBundle, type AcademyMemberRole } from "@/lib/team/academyMemberRole";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";
import type { AcademyAttendanceRow } from "@/lib/academy/academyAttendanceReadTypes";
import type { AcademySessionRow } from "@/lib/academy/academySessionReadTypes";

export function canViewAcademyAttendanceSurface(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  if (isTeamAdminBundle(role) || role === "coach") return true;
  if (role === "parent" || role === "player") return true;
  return false;
}

/** CF mirror: owner | manager | staff | coach may mark attendance (A2-6-4). */
export function canMarkAcademyAttendance(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return role === "owner" || role === "manager" || role === "staff" || role === "coach";
}

/** S1 — session CRUD UI (v1: staff hidden; CF still allows staff). */
export function canManageAcademySessions(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return role === "owner" || role === "manager" || role === "coach";
}

/** Phase B S1 — trainingBlocks library (staff + coach). */
export function canManageTrainingBlocks(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return isTeamAdminBundle(role) || role === "coach";
}

/** Phase B S1 — archive blocks (staff bundle only). */
export function canArchiveTrainingBlocks(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return isTeamAdminBundle(role);
}

export function canCoachManageSession(
  session: Pick<AcademySessionRow, "createdBy" | "coachUid">,
  viewerUid: string
): boolean {
  return session.createdBy === viewerUid || session.coachUid === viewerUid;
}

/** Owner/manager: all sessions; coach: scoped; staff v1: no UI. */
export function canEditAcademySession(
  session: AcademySessionRow,
  viewerRole: AcademyMemberRole,
  viewerUid: string
): boolean {
  if (!canManageAcademySessions(viewerRole)) return false;
  if (viewerRole === "owner" || viewerRole === "manager") return true;
  if (viewerRole === "coach") return canCoachManageSession(session, viewerUid);
  return false;
}

export function linkedPlayerUidsForParent(links: ParentLinkRow[], parentUid: string): Set<string> {
  const out = new Set<string>();
  for (const l of links) {
    if (l.parentUid !== parentUid) continue;
    if (l.status !== "active" && l.status !== "pending") continue;
    if (l.playerUid) out.add(l.playerUid);
  }
  return out;
}

/** Filter attendance rows for viewer persona (post-fetch). */
export function filterAttendanceForViewer(
  rows: AcademyAttendanceRow[],
  viewerUid: string,
  viewerRole: AcademyMemberRole,
  parentLinks: ParentLinkRow[]
): AcademyAttendanceRow[] {
  if (isTeamAdminBundle(viewerRole) || viewerRole === "coach") return rows;
  if (viewerRole === "player") {
    return rows.filter((r) => r.targetUid === viewerUid);
  }
  if (viewerRole === "parent") {
    const children = linkedPlayerUidsForParent(parentLinks, viewerUid);
    return rows.filter((r) => children.has(r.targetUid));
  }
  return [];
}

/** Sessions list: generic members excluded; parent/player may view list for linked context. */
export function filterSessionsForViewer(
  sessions: AcademySessionRow[],
  viewerRole: AcademyMemberRole
): AcademySessionRow[] {
  if (viewerRole === "member") return [];
  return sessions;
}
