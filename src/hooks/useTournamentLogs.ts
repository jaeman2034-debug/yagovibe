/**
 * 🔥 토너먼트 운영 로그 실시간 구독 Hook
 * 
 * 기능:
 * - Firestore logs 컬렉션 실시간 구독
 * - 최신순 정렬 (createdAt desc)
 * - 새로고침해도 유지
 */

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTournamentLogs(
  associationId: string | undefined,
  tournamentId: string | undefined
) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !tournamentId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const logsRef = collection(
        db,
        "associations",
        associationId,
        "tournaments",
        tournamentId,
        "logs"
      );

      const q = query(
        logsRef,
        orderBy("createdAt", "desc"),
        // 🔥 로그 폭증 방지: 최근 50개만 표시
        // limit(50) // onSnapshot에서는 limit을 직접 사용하지 않고, 클라이언트에서 자르거나 백엔드에서 제한
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setLogs(data);
          setLoading(false);
        },
        (error: any) => {
          console.error("[운영 로그 구독 오류]", error);
          setLogs([]);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err: any) {
      console.error("[운영 로그 쿼리 설정 오류]", err);
      setLogs([]);
      setLoading(false);
    }
  }, [associationId, tournamentId]);

  return { logs, loading };
}

