/**
 * 🔥 참가팀 스냅샷 실시간 구독 Hook
 * 
 * 기능:
 * - teamsSnapshot 컬렉션 실시간 구독
 * - 운영자/관중 공용
 * - 읽기 전용
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTournamentTeamsSnapshot(
  associationId: string | undefined,
  tournamentId: string | undefined
) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !tournamentId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      const ref = collection(
        db,
        "associations",
        associationId,
        "tournaments",
        tournamentId,
        "teamsSnapshot"
      );

      const unsub = onSnapshot(
        ref,
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setTeams(data);
          setLoading(false);
        },
        (error: any) => {
          // 🔥 권한 오류는 조용히 처리 (일반 사용자는 teamsSnapshot 컬렉션 접근 불가일 수 있음)
          if (error?.code === "permission-denied" || error?.code === "missing-or-insufficient-permissions") {
            console.log("[참가팀 스냅샷 구독] 권한 없음 - 일반 사용자일 수 있음");
            setTeams([]);
            setLoading(false);
          } else {
            console.error("[참가팀 스냅샷 구독 오류]", error);
            setTeams([]);
            setLoading(false);
          }
        }
      );

      return () => unsub();
    } catch (err: any) {
      console.error("[참가팀 스냅샷 쿼리 설정 오류]", err);
      setTeams([]);
      setLoading(false);
    }
  }, [associationId, tournamentId]);

  return { teams, loading };
}

