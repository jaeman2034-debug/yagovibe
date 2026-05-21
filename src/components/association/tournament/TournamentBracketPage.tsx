/**
 * 대회 대진표 페이지
 * 연령대별 탭으로 구분하여 표시
 */

import React from "react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament, Bracket, AgeDivision } from "@/types/tournament";
import { AGE_DIVISION_LABELS } from "@/types/tournament";
import { BracketDisplay } from "./BracketDisplay";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export function TournamentBracketPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<AgeDivision | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !tournamentId) return;

    const fetchBrackets = async () => {
      try {
        // 대회 정보 로드
        const tournamentRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}`
        );
        const tournamentSnap = await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
          setLoading(false);
          return;
        }

        const tournamentData = {
          id: tournamentSnap.id,
          ...tournamentSnap.data(),
        } as Tournament;

        setTournament(tournamentData);

        // 연령대별 대진표 로드
        const bracketsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/brackets`
        );
        const bracketsSnap = await getDocs(bracketsRef);

        const bracketsData: Bracket[] = bracketsSnap.docs.map((d) => ({
          ...d.data(),
        })) as Bracket[];

        setBrackets(bracketsData);
      } catch (error) {
        console.error("[TournamentBracketPage] 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrackets();
  }, [associationId, tournamentId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <div className="text-center">대회를 찾을 수 없습니다.</div>
      </div>
    );
  }

  // 연령대 필터링
  const displayedBrackets =
    selectedDivision === "all"
      ? brackets
      : brackets.filter((b) => b.division === selectedDivision);

  // 모든 연령대 목록
  const allDivisions: AgeDivision[] = ["youth", "middle", "senior", "silver"];

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 space-y-8">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
        <p className="text-muted-foreground">대진표</p>
      </div>

      {/* 연령대 탭 */}
      <div className="flex gap-2 flex-wrap justify-center">
        <Button
          variant={selectedDivision === "all" ? "default" : "outline"}
          onClick={() => setSelectedDivision("all")}
        >
          전체
        </Button>
        {allDivisions.map((div) => {
          const bracket = brackets.find((b) => b.division === div);
          return (
            <Button
              key={div}
              variant={selectedDivision === div ? "default" : "outline"}
              onClick={() => setSelectedDivision(div)}
            >
              {AGE_DIVISION_LABELS[div]}
              {bracket?.confirmed && (
                <span className="ml-2 text-xs">✓</span>
              )}
            </Button>
          );
        })}
      </div>

      {/* 대진표 표시 */}
      {displayedBrackets.length === 0 ? (
        <div className="text-center py-16 border-t">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">대진표가 아직 등록되지 않았습니다.</p>
          <p className="text-sm text-muted-foreground mt-2">
            대진표 확정 후 공개됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayedBrackets.map((bracket) => (
            <BracketDisplay
              key={bracket.division}
              bracket={bracket}
              tournamentName={tournament.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

