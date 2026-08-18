import { collection, getDocs } from "firebase/firestore";
import { pickDisplayNameFromRecord } from "@/lib/team/memberDisplayName";
import { db } from "@/lib/firebase";

/**
 * 팀 멤버 displayName → Auth uid (teams/{teamId}/members/{uid}).
 * 선수 = 로그인 사용자일 때만 Avatar 미러 대상.
 */
export async function resolveTeamMemberUidByDisplayName(
  teamId: string,
  displayName: string
): Promise<string | null> {
  const target = displayName.trim();
  if (!teamId || !target) return null;

  const snap = await getDocs(collection(db, "teams", teamId, "members"));

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const status = String(data.status ?? "active").toLowerCase();
    if (status === "removed" || status === "suspended") continue;

    const name =
      pickDisplayNameFromRecord(data) ||
      String(data.displayName ?? data.name ?? "").trim();
    if (name !== target) continue;

    const uid =
      (typeof data.uid === "string" && data.uid.trim()) ||
      (typeof data.userId === "string" && data.userId.trim()) ||
      docSnap.id;

    if (!uid || uid.startsWith("invite-")) continue;
    return uid;
  }

  return null;
}
