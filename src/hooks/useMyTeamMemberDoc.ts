import { useEffect, useState } from "react";
import { collection, onSnapshot, type QuerySnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberLikeForPlay } from "@/utils/playerStats";

export type MyTeamMemberRow = MemberLikeForPlay & {
  memberDocumentId: string;
};

function rowFromDoc(memberDocId: string, m: Record<string, unknown>): MyTeamMemberRow | null {
  const del = m.isDeleted === true;
  if (del) return null;
  const userIdField = typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : "";
  const displayName =
    typeof m.displayName === "string" && m.displayName.trim()
      ? m.displayName.trim()
      : typeof m.name === "string" && m.name.trim()
        ? m.name.trim()
        : "";
  const name = typeof m.name === "string" ? m.name : displayName;
  const jerseyNumber = m.jerseyNumber;
  const position = typeof m.position === "string" ? m.position : undefined;
  return {
    memberDocumentId: memberDocId,
    id: memberDocId,
    uid: userIdField || undefined,
    userId: userIdField || undefined,
    displayName: displayName || name || "선수",
    name,
    jerseyNumber: typeof jerseyNumber === "number" ? String(jerseyNumber) : (jerseyNumber as string | undefined),
    uniformNumber: typeof jerseyNumber === "number" ? String(jerseyNumber) : (jerseyNumber as string | undefined),
    position,
  };
}

/**
 * 현재 사용자의 `teams/{teamId}/members/{doc}` 행 찾기 (SoT 연동용)
 */
export function useMyTeamMemberDoc(teamId: string | undefined, authUid: string | undefined | null) {
  const [member, setMember] = useState<MyTeamMemberRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = typeof authUid === "string" ? authUid.trim() : "";
    if (!teamId?.trim() || !uid) {
      setMember(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const col = collection(db, "teams", teamId, "members");

    const pick = (snap: QuerySnapshot) => {
      for (const docSnap of snap.docs) {
        const m = docSnap.data() as Record<string, unknown>;
        const mu = typeof m.userId === "string" && m.userId.trim() ? m.userId.trim() : "";
        if (mu === uid) {
          const r = rowFromDoc(docSnap.id, m);
          return r;
        }
      }
      return null;
    };

    const unsub = onSnapshot(
      col,
      (snap) => {
        setMember(pick(snap));
        setLoading(false);
      },
      () => {
        setMember(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, authUid]);

  return { member, loading };
}
