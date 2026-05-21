/**
 * 🔥 useTeamMembers - 팀 멤버 조회 훅
 * 
 * 역할:
 * - 팀 멤버 UID 목록 조회
 * - 실시간 업데이트
 * 
 * UX 목적:
 * - 코치 대시보드에서 선수 목록 가져오기
 */

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🔥 팀 멤버 조회 훅
 * 
 * @param teamId 팀 ID
 * @returns 멤버 UID 목록, 로딩 상태
 */
export function useTeamMembers(teamId?: string) {
  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setMemberUids([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 🔥 teams/{teamId}/members 서브컬렉션 조회
    const membersRef = collection(db, "teams", teamId, "members");

    let cancelled = false;

    const unsubscribe = onSnapshot(
      membersRef,
      (snapshot) => {
        if (cancelled) return;
        const uids = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            // 🔥 삭제된 멤버 제외
            if (data.isDeleted === true) {
              return null;
            }
            // 🔥 doc.id가 uid (서브컬렉션 구조)
            return doc.id;
          })
          .filter((uid): uid is string => uid !== null);
        setMemberUids(uids);
        setLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("❌ [useTeamMembers] 팀 멤버 조회 실패:", error);
        setMemberUids([]);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [teamId]);

  return {
    memberUids,
    loading,
  };
}
