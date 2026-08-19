/**
 * Phase A A2-2 — PURE READ ONLY team membership queries.
 * No writes, callables, or transactions.
 */

import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  isTeamAdminBundle,
  normalizeMemberRole,
  type AcademyMemberRole,
} from "@/lib/team/academyMemberRole";
import { getMemberBillingUid } from "@/lib/team/memberBillingUid";
import type { ReadTeamMembersOptions, TeamMemberRow, TeamMemberStatus } from "@/lib/team/teamMemberReadTypes";

export type { TeamMemberRow, TeamMemberStatus, ReadTeamMembersOptions } from "@/lib/team/teamMemberReadTypes";

const DEFAULT_STATUSES: TeamMemberStatus[] = ["active"];

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function parseStatus(raw: unknown): TeamMemberStatus {
  const s = String(raw ?? "active").toLowerCase();
  if (s === "invited" || s === "suspended" || s === "removed") return s;
  return "active";
}

function displayNameFromData(data: Record<string, unknown>): string {
  return String(data.name ?? data.displayName ?? data.userName ?? "이름없음");
}

/** Pure mapper: Firestore member doc → TeamMemberRow (role-normalized). */
export function mapMemberDocToRow(docSnap: QueryDocumentSnapshot<DocumentData>): TeamMemberRow {
  const data = docSnap.data() as Record<string, unknown>;
  const authFields = str(data.userId) || str(data.uid);
  const billingUid = getMemberBillingUid(data as { userId?: unknown; uid?: unknown }, docSnap.id);

  return {
    memberDocumentId: docSnap.id,
    linkedAuthUid: authFields,
    billingUid,
    role: normalizeMemberRole(data.role as string | undefined),
    status: parseStatus(data.status),
    displayName: displayNameFromData(data),
    photoUrl: str(data.photoUrl) || str(data.photoURL),
    joinedAt: data.joinedAt,
    raw: data,
  };
}

function matchesFilters(row: TeamMemberRow, opts: ReadTeamMembersOptions): boolean {
  if (opts.excludeDeleted !== false && row.raw.isDeleted === true) return false;
  const statuses = opts.statuses ?? DEFAULT_STATUSES;
  if (!statuses.includes(row.status)) return false;
  if (opts.roles?.length && !opts.roles.includes(row.role)) return false;
  return true;
}

async function fetchMemberDocs(teamId: string, statuses: TeamMemberStatus[]): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const col = collection(db, "teams", teamId, "members");
  if (statuses.length === 1) {
    const q = query(col, where("status", "==", statuses[0]));
    const snap = await getDocs(q);
    return snap.docs;
  }
  const snap = await getDocs(col);
  return snap.docs;
}

/**
 * Read team members with optional status/role filters (in-memory role filter).
 */
export async function readTeamMembers(
  teamId: string,
  options: ReadTeamMembersOptions = {}
): Promise<TeamMemberRow[]> {
  if (!teamId.trim()) return [];
  const statuses = options.statuses ?? DEFAULT_STATUSES;
  const docs = await fetchMemberDocs(teamId, statuses);
  return docs.map(mapMemberDocToRow).filter((row) => matchesFilters(row, options));
}

export async function readMembersByRole(
  teamId: string,
  roles: AcademyMemberRole[],
  options: Omit<ReadTeamMembersOptions, "roles"> = {}
): Promise<TeamMemberRow[]> {
  return readTeamMembers(teamId, { ...options, roles });
}

export async function readActiveTeamMembers(
  teamId: string,
  options: Omit<ReadTeamMembersOptions, "statuses"> = {}
): Promise<TeamMemberRow[]> {
  return readTeamMembers(teamId, { ...options, statuses: ["active"] });
}

export function readCoaches(teamId: string, options?: Omit<ReadTeamMembersOptions, "roles">) {
  return readMembersByRole(teamId, ["coach"], options);
}

export function readPlayers(teamId: string, options?: Omit<ReadTeamMembersOptions, "roles">) {
  return readMembersByRole(teamId, ["player"], options);
}

export function readParents(teamId: string, options?: Omit<ReadTeamMembersOptions, "roles">) {
  return readMembersByRole(teamId, ["parent"], options);
}

/** owner | manager | staff (operations bundle) */
export function readStaff(teamId: string, options?: Omit<ReadTeamMembersOptions, "roles">) {
  return readActiveTeamMembers(teamId, options).then((rows) =>
    rows.filter((r) => isTeamAdminBundle(r.role))
  );
}
