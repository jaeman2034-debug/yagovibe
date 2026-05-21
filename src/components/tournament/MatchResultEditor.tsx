/**
 * 🔥 경기 결과 입력 UI
 * 
 * 관리자는 점수만 입력 → 시스템이 승자 계산
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFunctions, httpsCallable } from "firebase/functions";

interface Match {
  id: string;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  scoreHome?: number;
  scoreAway?: number;
  winnerTeamId?: string;
  status?: "scheduled" | "playing" | "finished";
  round?: number;
  matchNumber?: string;
}

interface MatchResultEditorProps {
  associationId: string;
  tournamentId: string;
  match: Match;
  onResultSaved?: () => void;
}

export function MatchResultEditor({
  associationId,
  tournamentId,
  match,
  onResultSaved,
}: MatchResultEditorProps) {
  const [scoreHome, setScoreHome] = useState<number | "">(match.scoreHome ?? "");
  const [scoreAway, setScoreAway] = useState<number | "">(match.scoreAway ?? "");
  const [loading, setLoading] = useState(false);

  // match 변경 시 점수 업데이트
  useEffect(() => {
    setScoreHome(match.scoreHome ?? "");
    setScoreAway(match.scoreAway ?? "");
  }, [match.scoreHome, match.scoreAway]);

  async function handleSubmit() {
    if (scoreHome === "" || scoreAway === "") {
      return toast.error("점수를 입력해주세요.");
    }

    const home = Number(scoreHome);
    const away = Number(scoreAway);

    if (isNaN(home) || isNaN(away)) {
      return toast.error("유효한 숫자를 입력해주세요.");
    }

    if (home < 0 || away < 0) {
      return toast.error("점수는 0 이상이어야 합니다.");
    }

    if (home === away) {
      return toast.error("무승부는 허용되지 않습니다. 승부차기 결과를 입력해주세요.");
    }

    setLoading(true);
    try {
      const submitMatchResult = httpsCallable(getFunctions(), "submitMatchResultCallable");

      const result = await submitMatchResult({
        associationId,
        tournamentId,
        matchId: match.id,
        scoreHome: home,
        scoreAway: away,
      });

      const data = result.data as any;
      toast.success(
        `경기 결과 저장 완료! 승자: ${data.winnerTeamName || "확인 필요"}`
      );

      onResultSaved?.();
    } catch (error: any) {
      console.error("경기 결과 저장 실패:", error);
      toast.error(error.message || "경기 결과 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const isFinished = match.status === "finished";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 경기 정보 */}
          <div className="text-sm text-muted-foreground">
            {match.matchNumber && <span>경기 {match.matchNumber}</span>}
            {match.round && <span className="ml-2">라운드 {match.round}</span>}
          </div>

          {/* 팀 정보 및 점수 입력 */}
          <div className="flex items-center gap-4">
            {/* 홈팀 */}
            <div className="flex-1 text-right">
              <div className="font-medium">{match.homeTeamName || "홈팀"}</div>
              {match.homeTeamId && (
                <div className="text-xs text-muted-foreground">ID: {match.homeTeamId}</div>
              )}
            </div>

            {/* 점수 입력 */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-20 text-center"
                value={scoreHome}
                onChange={(e) =>
                  setScoreHome(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={loading || isFinished}
                min="0"
              />
              <span className="text-lg font-bold">:</span>
              <Input
                type="number"
                className="w-20 text-center"
                value={scoreAway}
                onChange={(e) =>
                  setScoreAway(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={loading || isFinished}
                min="0"
              />
            </div>

            {/* 원정팀 */}
            <div className="flex-1 text-left">
              <div className="font-medium">{match.awayTeamName || "원정팀"}</div>
              {match.awayTeamId && (
                <div className="text-xs text-muted-foreground">ID: {match.awayTeamId}</div>
              )}
            </div>
          </div>

          {/* 승자 표시 */}
          {isFinished && match.winnerTeamId && (
            <div className="text-center">
              <Badge className="bg-green-600">
                승자: {match.winnerTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName}
              </Badge>
            </div>
          )}

          {/* 저장 버튼 */}
          {!isFinished && (
            <div className="flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={loading || scoreHome === "" || scoreAway === ""}
                className="w-full"
              >
                {loading ? "저장 중..." : "경기 결과 저장"}
              </Button>
            </div>
          )}

          {isFinished && (
            <div className="text-center text-sm text-muted-foreground">
              경기가 종료되었습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

