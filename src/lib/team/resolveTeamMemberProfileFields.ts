import type { User } from "firebase/auth";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import { pickDisplayNameFromRecord } from "./memberDisplayName";

export type TeamMemberProfileWriteFields = {
  name: string;
  displayName: string;
  userName: string;
};

/**
 * `teams/{teamId}/members/{uid}` 에 넣을 표시 이름 필드.
 * - 같은 uid로 로그인한 Auth 유저가 있으면 displayName·email 로컬 우선
 * - 없으면 Firestore `users/{uid}` 에서 pick
 * - 둘 다 없으면 null (문서에는 userId만 두고 CF 백필에 맡김)
 */
export async function resolveTeamMemberProfileFields(
  db: Firestore,
  uid: string,
  authUser?: User | null
): Promise<TeamMemberProfileWriteFields | null> {
  if (authUser?.uid === uid) {
    const fromAuth =
      (typeof authUser.displayName === "string" && authUser.displayName.trim()) ||
      (typeof authUser.email === "string" && authUser.email.includes("@")
        ? authUser.email.split("@")[0]?.trim() ?? ""
        : "");
    if (fromAuth) {
      return { name: fromAuth, displayName: fromAuth, userName: fromAuth };
    }
  }
  try {
    const uSnap = await getDoc(doc(db, "users", uid));
    if (uSnap.exists()) {
      const v = pickDisplayNameFromRecord(uSnap.data() as Record<string, unknown>);
      if (v) {
        return { name: v, displayName: v, userName: v };
      }
    }
  } catch {
    /* rules 등 */
  }
  return null;
}
