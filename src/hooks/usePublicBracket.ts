/**
 * 🔥 공개 대진표 데이터 로딩 훅
 * 로그인 없이 대진표 데이터를 조회
 */

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";

type Round = {
  id: string;
  roundNumber?: number;
  title?: string;
  name?: string;
  division?: string;
};

type Match = {
  id: string;
  roundNumber?: number;
  division?: string;
  homeTeamName?: string;
  homeTeamId?: string;
  awayTeamName?: string;
  awayTeamId?: string;
  scheduledAt?: any;
  venue?: string;
  field?: string;
  status?: 'scheduled' | 'playing' | 'finished' | 'pending';
  winner?: 'home' | 'away' | string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
};

interface UsePublicBracketResult {
  tournament: Tournament | null;
  rounds: Round[];
  matches: Match[];
  loading: boolean;
  error: string | null;
  associationId: string | null;
}

export function usePublicBracket(tournamentId: string | undefined): UsePublicBracketResult {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [associationId, setAssociationId] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setError("대회 ID가 필요합니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 1. Tournament 문서 조회 - associations 컬렉션에서 검색
        let tournamentData: Tournament | null = null;
        let foundAssociationId: string | null = null;

        const associationsRef = collection(db, "associations");
        const associationsSnap = await getDocs(associationsRef);
        
        for (const assocDoc of associationsSnap.docs) {
          if (cancelled) return;
          
          const assocId = assocDoc.id;
          const tournamentRef = doc(db, `associations/${assocId}/tournaments/${tournamentId}`);
          const tournamentDoc = await getDoc(tournamentRef);
          
          if (tournamentDoc.exists()) {
            tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;
            foundAssociationId = assocId;
            break;
          }
        }

        if (cancelled) return;

        if (!tournamentData || !foundAssociationId) {
          setError("대회를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setTournament(tournamentData);
        setAssociationId(foundAssociationId);

        // 🔥 2. Rounds 조회
        const roundsRef = collection(db, `associations/${foundAssociationId}/tournaments/${tournamentId}/rounds`);
        const roundsQuery = query(roundsRef, orderBy("roundNumber", "asc"));
        const roundsSnap = await getDocs(roundsQuery);
        
        if (cancelled) return;
        
        const roundsData = roundsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Round[];
        setRounds(roundsData);

        // 🔥 3. Matches 조회
        const matchesRef = collection(db, `associations/${foundAssociationId}/tournaments/${tournamentId}/matches`);
        const matchesQuery = query(matchesRef, orderBy("roundNumber", "asc"));
        const matchesSnap = await getDocs(matchesQuery);
        
        if (cancelled) return;
        
        const matchesData = matchesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Match[];
        setMatches(matchesData);
      } catch (err: any) {
        if (cancelled) return;
        console.error("데이터 로드 오류:", err);
        setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  return {
    tournament,
    rounds,
    matches,
    loading,
    error,
    associationId,
  };
}

