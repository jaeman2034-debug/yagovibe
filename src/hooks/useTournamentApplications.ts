/**
 * 🔥 useTournamentApplications - 대회 참가 신청 목록 조회 훅 (관리자용)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 신청 0개 → [] → 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication } from "@/types/tournament";

interface UseTournamentApplicationsOptions {
  enabled?: boolean;
}

export function useTournamentApplications(
  associationId: string | undefined,
  tournamentId: string | undefined,
  options?: UseTournamentApplicationsOptions
) {
  const enabled = options?.enabled !== false && !!associationId && !!tournamentId;

  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setApplications([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError(null);

        const applicationsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/applications`
        );
        const q = query(
          applicationsRef,
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);

        const applicationsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TournamentApplication[];

        setApplications(applicationsData);
      } catch (err) {
        console.warn("[useTournamentApplications] 신청 목록 조회 실패 (정상 상태로 처리):", err);
        setApplications([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("신청 목록 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [enabled, associationId, tournamentId]);

  return {
    applications,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
