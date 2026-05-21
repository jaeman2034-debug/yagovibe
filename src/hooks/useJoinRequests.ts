/**
 * 🔥 useJoinRequests - 팀 가입 요청 목록 조회 훅 (STEP: 팀원 가입 플로우)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - pending 0개 → [] → 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamJoinRequest } from "@/lib/team/teamJoinRequest";

interface UseJoinRequestsOptions {
  enabled?: boolean;
}

export function useJoinRequests(
  teamId: string | undefined,
  options?: UseJoinRequestsOptions
) {
  const enabled = options?.enabled !== false && !!teamId;

  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(db, "teamJoinRequests"),
          where("teamId", "==", teamId),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc") // 최신 요청부터
        );
        const snap = await getDocs(q);

        const requestsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TeamJoinRequest[];

        setRequests(requestsData);
      } catch (err) {
        console.warn("[useJoinRequests] 가입 요청 조회 실패 (정상 상태로 처리):", err);
        setRequests([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("가입 요청 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [enabled, teamId]);

  return {
    requests,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
