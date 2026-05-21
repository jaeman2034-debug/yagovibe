/**
 * 🔥 TournamentResultsCard - 대회 결과 카드 (STEP: 대회 결과/기록 시스템)
 * 
 * P2/P3 PersonaSection에 추가
 * - 최근 대회 결과 표시
 * - 결과 없으면 카드 자체 미노출
 * - EmptyState ❌
 */

import { useTournamentResults } from "@/hooks/useTournamentResults";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/cards/Card";
import { Trophy, Medal } from "lucide-react";

interface TournamentResultWithName {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  rank?: number;
  score?: number;
  resultText?: string;
  recordedAt: any;
}

export function TournamentResultsCard() {
  const { teamMembers } = useMyTeams();
  const myTeam = teamMembers[0];
  const [resultsWithNames, setResultsWithNames] = useState<TournamentResultWithName[]>([]);
  const [loading, setLoading] = useState(true);

  // 내 팀의 결과 조회
  const { results } = useTournamentResults({
    enabled: !!myTeam,
    teamId: myTeam?.teamId,
  });

  // 결과 데이터 준비 (대회 이름은 나중에 최적화)
  useEffect(() => {
    if (!results.length) {
      setResultsWithNames([]);
      setLoading(false);
      return;
    }

    // 간단화: tournamentId만 표시 (나중에 associationId 포함하여 최적화 가능)
    const resultsWithNamesData = results.map((result) => ({
      ...result,
      tournamentName: `대회 ${result.tournamentId.slice(0, 8)}...`,
    }));

    setResultsWithNames(resultsWithNamesData);
    setLoading(false);
  }, [results]);

  // 결과 없으면 카드 자체 미노출
  if (!myTeam || results.length === 0) {
    return null;
  }

  if (loading) {
    return null;
  }

  // 최근 3개만 표시
  const recentResults = resultsWithNames.slice(0, 3);

  return (
    <Card variant="summary" className="bg-white border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-green-600" />
        <h2 className="text-base font-semibold text-gray-900">최근 대회 결과</h2>
      </div>
      <div className="space-y-2">
        {recentResults.map((result) => (
          <div key={result.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {result.rank && (
                <Medal className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-gray-700">
                {result.tournamentName || "대회"}
                {result.resultText && ` - ${result.resultText}`}
              </span>
            </div>
            {result.rank && (
              <span className="font-semibold text-gray-900">{result.rank}위</span>
            )}
            {result.score !== undefined && !result.rank && (
              <span className="font-semibold text-gray-900">{result.score}점</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
