/**
 * 🔥 선수 명단 조회 Hook
 * 
 * applicationId를 기반으로 선수 명단과 상태를 조회합니다.
 */

import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication } from "@/types/tournament";

export interface RosterPlayer {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  position?: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt?: any;
  updatedAt?: any;
}

export type RosterStatus = "draft" | "submitted" | "locked";

interface UseRosterResult {
  roster: {
    applicationId: string;
    playerCount: number;
    maxPlayers: number;
    rosterStatus: RosterStatus;
  } | null;
  players: RosterPlayer[];
  loading: boolean;
  error: Error | null;
}

/**
 * 선수 명단 조회 Hook
 */
export function useRoster(applicationId: string | undefined): UseRosterResult {
  const [roster, setRoster] = useState<UseRosterResult["roster"]>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setRoster(null);
      setPlayers([]);
      setLoading(false);
      return;
    }

    const loadRoster = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 TODO: applicationId로 application 조회
        // 임시로 빈 값 처리
        // const appRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`);
        // const appSnap = await getDoc(appRef);
        
        // 🔥 TODO: players 컬렉션 조회
        // const playersRef = collection(db, `rosters/${applicationId}/players`);
        // const playersQuery = query(playersRef, orderBy("createdAt", "asc"));
        // const playersSnap = await getDocs(playersQuery);
        
        // 임시 데이터
        setRoster({
          applicationId,
          playerCount: 0,
          maxPlayers: 12,
          rosterStatus: "draft",
        });
        setPlayers([]);
      } catch (err) {
        console.error("[useRoster] 조회 실패:", err);
        setError(err instanceof Error ? err : new Error("알 수 없는 오류"));
        setRoster(null);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadRoster();
  }, [applicationId]);

  return {
    roster,
    players,
    loading,
    error,
  };
}
