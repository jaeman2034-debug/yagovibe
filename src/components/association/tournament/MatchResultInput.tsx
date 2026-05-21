/**
 * 경기 결과 입력 컴포넌트 (관리자용)
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Match } from "@/types/tournament";
import { updateMatchResult } from "@/lib/tournament/updateMatchResult";
import { Trophy } from "lucide-react";

interface MatchResultInputProps {
  associationId: string;
  tournamentId: string;
  division: string;
  match: Match;
  onResultUpdated?: () => void;
}

export function MatchResultInput({
  associationId,
  tournamentId,
  division,
  match,
  onResultUpdated,
}: MatchResultInputProps) {
  const [homeScore, setHomeScore] = useState<number>(match.scoreA || 0);
  const [awayScore, setAwayScore] = useState<number>(match.scoreB || 0);
  const [resultType, setResultType] = useState<"FT" | "PK" | "ET">("FT");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const homeTeam =
    match.homeSlot?.type === "TEAM"
      ? match.homeSlot.teamName
      : match.homeSlot?.refMatchNumber || match.teamA || "대기중";
  const awayTeam =
    match.awaySlot?.type === "TEAM"
      ? match.awaySlot.teamName
      : match.awaySlot?.refMatchNumber || match.teamB || "대기중";

  const handleSubmit = async () => {
    if (homeScore === awayScore && resultType === "FT") {
      alert("전반 종료 시 무승부는 불가능합니다. 승부차기 또는 연장전을 선택해주세요.");
      return;
    }

    const winner = homeScore > awayScore ? "HOME" : "AWAY";

    setIsSubmitting(true);
    try {
      await updateMatchResult(associationId, tournamentId, division, {
        matchId: match.id,
        scoreA: homeScore,
        scoreB: awayScore,
        resultType,
        winner,
      });

      alert("경기 결과가 저장되었습니다. 다음 경기 대진표가 자동으로 업데이트됩니다.");
      onResultUpdated?.();
    } catch (error) {
      console.error("경기 결과 저장 오류:", error);
      alert("경기 결과 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (match.status === "completed") {
    return (
      <Card className="rounded-lg border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">경기 완료</span>
          </div>
          <div className="mt-2 text-sm">
            <div>
              {homeTeam} {match.scoreA} : {match.scoreB} {awayTeam}
            </div>
            <div className="text-gray-600 mt-1">
              {match.resultType === "FT" && "전반"}
              {match.resultType === "PK" && "승부차기"}
              {match.resultType === "ET" && "연장전"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardContent className="p-4 space-y-4">
        <div className="text-sm font-semibold">경기 결과 입력</div>

        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-right font-medium">{homeTeam}</div>
          <div className="flex gap-2 items-center justify-center">
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <span>:</span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border rounded text-center"
            />
          </div>
          <div className="text-left font-medium">{awayTeam}</div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={resultType === "FT" ? "default" : "outline"}
            size="sm"
            onClick={() => setResultType("FT")}
          >
            전반
          </Button>
          <Button
            variant={resultType === "PK" ? "default" : "outline"}
            size="sm"
            onClick={() => setResultType("PK")}
          >
            승부차기
          </Button>
          <Button
            variant={resultType === "ET" ? "default" : "outline"}
            size="sm"
            onClick={() => setResultType("ET")}
          >
            연장전
          </Button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "저장 중..." : "결과 저장"}
        </Button>
      </CardContent>
    </Card>
  );
}

