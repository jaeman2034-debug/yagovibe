import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CreateTeamCallableType = "normal" | "academy";

export const CF_AGE_GROUPS = ["U-10", "U-12", "U-15", "U-18"] as const;
export const CF_TRAINING_LEVELS = ["beginner", "intermediate", "elite"] as const;

export type CreateTeamRequest = {
  name: string;
  region: string;
  sportType: string;
  type: CreateTeamCallableType;
  associationId: string | null;
  /** Optional English handle used by createTeam slug policy (Sprint 1-1). */
  shortName?: string | null;
  academyMeta?: {
    ageGroup: (typeof CF_AGE_GROUPS)[number];
    trainingLevel: (typeof CF_TRAINING_LEVELS)[number];
    recruitOpen: boolean;
    description: string;
    mainCoachUserId: string | null;
  };
};

/** createTeam callable result — teamId remains canonical; slug is optional derived. */
export type CreateTeamResult = {
  teamId: string;
  slug: string;
};

export {
  isValidTeamId,
  isValidTeamPublicSlug,
  parseSlugFromCallableResult,
  parseTeamIdFromCallableResult,
  resolveTeamPublicUrlKey,
} from "@/lib/team/createTeamResultParse";

function joinedAtMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function createdAtMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export async function resolveTeamIdFromMembershipMirror(
  uid: string,
  expectedTeamName: string
): Promise<string | null> {
  try {
    const snap = await getDocs(collection(db, "users", uid, "teamMemberships"));
    if (snap.empty) return null;
    const want = expectedTeamName.trim();
    const rows = snap.docs.map((d) => ({
      teamId: d.id,
      data: d.data() as Record<string, unknown>,
    }));
    if (want) {
      for (const row of rows) {
        const tn = String(row.data.teamName ?? "").trim();
        if (tn === want) return row.teamId;
      }
    }
    rows.sort((a, b) => joinedAtMillis(b.data.joinedAt) - joinedAtMillis(a.data.joinedAt));
    return rows[0]?.teamId ?? null;
  } catch (e) {
    console.warn("[createTeam] teamMemberships fallback 실패", e);
    return null;
  }
}

export async function resolveTeamIdFromOwnedTeams(uid: string, expectedTeamName: string): Promise<string | null> {
  const want = expectedTeamName.trim();
  const merge = new Map<string, Record<string, unknown>>();

  const runQuery = async (field: "ownerUserId" | "ownerUid") => {
    try {
      const q = query(collection(db, "teams"), where(field, "==", uid), limit(30));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => merge.set(d.id, d.data() as Record<string, unknown>));
    } catch (e) {
      console.warn(`[createTeam] teams.${field} 쿼리 실패`, e);
    }
  };

  try {
    await runQuery("ownerUserId");
    await runQuery("ownerUid");
    if (merge.size === 0) return null;

    const rows = [...merge.entries()].map(([id, data]) => ({ id, data }));
    if (want) {
      for (const row of rows) {
        if (String(row.data.name ?? "").trim() === want) return row.id;
      }
    }
    rows.sort((a, b) => createdAtMillis(b.data.createdAt) - createdAtMillis(a.data.createdAt));
    return rows[0]?.id ?? null;
  } catch (e) {
    console.warn("[createTeam] teams 소유자 fallback 실패", e);
    return null;
  }
}

export function extractTeamIdFromError(error: unknown): string | null {
  try {
    const errorStr = JSON.stringify(error);
    const teamIdMatch = errorStr.match(/teamId["\s:]+([a-zA-Z0-9_-]+)/i);
    return teamIdMatch ? teamIdMatch[1] : null;
  } catch {
    return null;
  }
}

export function buildTeamHomeAfterCreateQuery(isAnonymous: boolean): string {
  const q = new URLSearchParams();
  q.set("onboarding", "1");
  q.set("firstTeam", "1");
  if (isAnonymous) q.set("linkAccount", "1");
  return q.toString();
}
