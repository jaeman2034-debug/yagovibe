/**
 * 🔥 useTournament - 대회 데이터 조회 훅 (STEP 15A)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 (null)
 * - throw ❌
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";

interface UseTournamentOptions {
  enabled?: boolean;
  isAdmin?: boolean; // 관리자 여부 (published 체크용)
}

export function useTournament(
  associationId: string | undefined,
  tournamentId: string | undefined,
  options?: UseTournamentOptions
) {
  const enabled = options?.enabled !== false && !!associationId && !!tournamentId;
  const isAdmin = options?.isAdmin ?? false;
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTournament(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchTournament = async () => {
      try {
        setLoading(true);
        setError(null);

        const tournamentRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}`
        );
        const tournamentSnap = await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
          setTournament(null);
          setLoading(false);
          return;
        }

        const data = tournamentSnap.data();
        
        // ✅ adminStatus 체크 (공지 패턴과 동일)
        const adminStatus = data.adminStatus || data.status;
        
        // 일반 사용자는 published만 노출
        if (!isAdmin && adminStatus !== "published") {
          setTournament(null);
          setLoading(false);
          return;
        }

        const tournamentData = {
          id: tournamentSnap.id,
          ...data,
        } as Tournament;

        setTournament(tournamentData);
      } catch (err) {
        console.warn("[useTournament] 조회 실패 (정상 상태로 처리):", err);
        setTournament(null);
        setError(err instanceof Error ? err : new Error("대회 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [enabled, associationId, tournamentId, isAdmin]);

  return {
    tournament,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
