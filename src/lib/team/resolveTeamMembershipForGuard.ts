/**
 * TeamGuard / guardTeamAccess — useMyTeams·Firestore rules 와 동일한 멤버십 판별
 * collectionGroup 은 rules 상 Guard에서 permission-denied → 사용하지 않음
 */
import { doc, getDoc, type DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamRole } from "@/lib/team/roleConstants";
import { isActiveTeamMemberStatus } from "@/lib/team/teamPlayRoutes";

export type ResolvedTeamMembership = {
  role: TeamRole;
  status?: string;
};

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = String((err as { code?: unknown }).code ?? "");
  return code === "permission-denied" || code === "missing-or-insufficient-permissions";
}

function roleFromMemberData(data: Record<string, unknown>): TeamRole {
  const rawRole = data.role as string | undefined;
  if (rawRole === "owner" || rawRole === "admin" || rawRole === "member") {
    return rawRole;
  }
  const access = String(data.accessLevel ?? "").toUpperCase();
  if (access === "OWNER") return "owner";
  if (access === "ADMIN") return "admin";
  return "member";
}

async function safeGetDoc(path: string, ...segments: string[]): Promise<DocumentSnapshot | null> {
  try {
    const snap = await getDoc(doc(db, path, ...segments));
    return snap.exists() ? snap : null;
  } catch (err) {
    if (isPermissionDenied(err)) return null;
    throw err;
  }
}

function membershipFromSnap(snap: DocumentSnapshot): ResolvedTeamMembership | null {
  const data = snap.data() as Record<string, unknown>;
  if (!isActiveTeamMemberStatus(data.status as string | undefined)) return null;
  return { role: roleFromMemberData(data), status: data.status as string | undefined };
}

async function readTeamOwnerUid(teamId: string): Promise<string | null> {
  const teamSnap = await safeGetDoc("teams", teamId);
  if (!teamSnap) return null;
  const t = teamSnap.data() as Record<string, unknown>;
  for (const key of [
    "ownerUid",
    "ownerUserId",
    "ownerId",
    "leaderId",
    "createdBy",
    "captainId",
  ] as const) {
    const v = t[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

async function readTeamMembersMirror(
  uid: string,
  teamId: string,
): Promise<ResolvedTeamMembership | null> {
  const mirrorIds = [`${uid}_${teamId}`, `${teamId}_${uid}`];
  for (const mirrorId of mirrorIds) {
    const snap = await safeGetDoc("team_members", mirrorId);
    if (!snap) continue;
    const data = snap.data() as Record<string, unknown>;
    const mirrorUid = typeof data.uid === "string" ? data.uid : "";
    if (mirrorUid && mirrorUid !== uid) continue;
    if (!isActiveTeamMemberStatus(data.status as string | undefined)) continue;
    return { role: roleFromMemberData(data), status: data.status as string | undefined };
  }
  return null;
}

/**
 * teams/{teamId}/members/{uid} → team_members mirror → team owner 필드
 */
export async function resolveTeamMembershipForGuard(
  uid: string,
  teamId: string,
): Promise<ResolvedTeamMembership | null> {
  const tid = teamId.trim();
  const userId = uid.trim();
  if (!tid || !userId) return null;

  const directSnap = await safeGetDoc("teams", tid, "members", userId);
  if (directSnap) {
    const membership = membershipFromSnap(directSnap);
    if (membership) return membership;
  }

  const mirrorMembership = await readTeamMembersMirror(userId, tid);
  if (mirrorMembership) return mirrorMembership;

  const ownerUid = await readTeamOwnerUid(tid);
  if (ownerUid === userId) {
    return { role: "owner", status: "active" };
  }

  return null;
}
