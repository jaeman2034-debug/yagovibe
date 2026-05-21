/**
 * useHighlightedTournament
 * Hero Section에서 표시할 하이라이트 대회 조회
 * 
 * 규칙:
 * - status === "ongoing" 중 priority가 가장 높은 1개 선택
 * - 없으면 null 반환
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Tournament {
  id: string;
  title: string;
  season: string;
  status: "upcoming" | "ongoing" | "completed";
  priority: number;
}

export function useHighlightedTournament(associationId: string | undefined) {
  const [highlightedTournament, setHighlightedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) {
      setLoading(false);
      return;
    }

    const loadHighlightedTournament = async () => {
      try {
        // TODO: 실제 Firestore 구조에 맞게 수정 필요
        // 현재는 tournaments 컬렉션 가정
        // 실제 구조: tournaments/{tournamentId} with associationId field
        // 또는 associations/{associationId}/tournaments/{tournamentId}
        
        // Option 1: tournaments 컬렉션에서 associationId로 필터링
        const tournamentsRef = collection(db, "tournaments");
        const q = query(
          tournamentsRef,
          where("associationId", "==", associationId),
          where("status", "==", "ongoing"),
          orderBy("priority", "asc"),
          limit(1)
        );

        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setHighlightedTournament({
            id: doc.id,
            ...doc.data(),
          } as Tournament);
        } else {
          setHighlightedTournament(null);
        }
      } catch (error) {
        console.error("하이라이트 대회 조회 오류:", error);
        setHighlightedTournament(null);
      } finally {
        setLoading(false);
      }
    };

    loadHighlightedTournament();
  }, [associationId]);

  return { highlightedTournament, loading };
}

