/**
 * 🔥 FINAL STEP: 토너먼트 브라켓 UI (운영/참가자 공용)
 * 
 * 라운드별 대진을 한눈에 보여주는 브라켓 뷰
 * - 라운드 컬럼 기반 리스트 UI (복잡한 SVG 대신)
 * - 결과 입력/확인 직관적
 * - 팀/참가자 모두 혼란 없이 이해
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Loader2 } from "lucide-react";
import type { MatchOps } from "@/types/tournament";

interface TournamentBracketProps {
  matches: MatchOps[];
  isAdmin: boolean;
  onOpenScoreDialog?: (match: MatchOps) => void;
  currentTeamId?: string; // 참가자 본인 팀 ID (하이라이트용)
}

/**
 * 🔥 라운드 이름 표시 (UX)
 */
function roundLabel(round: number, totalRounds?: number): string {
  if (totalRounds) {
    // 총 라운드 수를 알면 정확한 라벨 표시
    if (round === totalRounds) return "결승";
    if (round === totalRounds - 1) return "준결승";
    if (round === totalRounds - 2) return "4강";
    if (round === totalRounds - 3) return "8강";
  }

  // 기본 라벨
  switch (round) {
    case 1:
      return "1라운드";
    case 2:
      return "8강";
    case 3:
      return "4강";
    case 4:
      return "준결승";
    case 5:
      return "결승";
    default:
      return `${round}라운드`;
  }
}

/**
 * 🔥 팀 행 컴포넌트
 */
function TeamRow({
  teamName,
  teamId,
  score,
  isWinner,
  isCurrentTeam,
  isBye = false,
}: {
  teamName: string | null;
  teamId?: string | null;
  score?: number;
  isWinner?: boolean;
  isCurrentTeam?: boolean;
  isBye?: boolean;
}) {
  const displayName = teamName || "TBD";
  const hasScore = score !== undefined && score !== null;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded transition-colors ${
        isWinner
          ? "bg-green-100 font-semibold text-green-800 border-2 border-green-400"
          : isCurrentTeam
          ? "bg-blue-50 border border-blue-200"
          : "bg-gray-50"
      } ${isBye ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`truncate ${isBye ? "text-gray-500 italic" : ""}`}>
          {isBye ? "BYE" : displayName}
        </span>
        {isCurrentTeam && (
          <Badge variant="outline" className="text-xs shrink-0">
            내 팀
          </Badge>
        )}
        {isWinner && (
          <Award className="w-4 h-4 text-green-600 shrink-0" />
        )}
      </div>
      {hasScore && (
        <span className={`font-bold text-lg ml-2 shrink-0 ${isWinner ? "text-green-700" : ""}`}>
          {score}
        </span>
      )}
    </div>
  );
}

/**
 * 🔥 경기 카드 컴포넌트
 */
function MatchCard({
  match,
  isAdmin,
  currentTeamId,
  onOpenScoreDialog,
}: {
  match: MatchOps;
  isAdmin: boolean;
  currentTeamId?: string;
  onOpenScoreDialog?: (match: MatchOps) => void;
}) {
  const homeTeamName = match.homeTeam || "TBD";
  const awayTeamName = match.awayTeam || "TBD";
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const isCompleted = match.status === "END" || match.status === "completed" || match.status === "FINISHED";
  const isBye = match.isBye === true;
  const winnerTeamId = match.winnerTeamId;

  const isHomeCurrentTeam = match.homeTeamId === currentTeamId;
  const isAwayCurrentTeam = match.awayTeamId === currentTeamId;
  const isHomeWinner = winnerTeamId === match.homeTeamId;
  const isAwayWinner = winnerTeamId === match.awayTeamId;

  const canInputScore = isAdmin && !isCompleted && !isBye && match.status === "WAIT";

  return (
    <div
      className={`border rounded-lg p-3 bg-white shadow-sm transition-all touch-manipulation ${
        isCompleted ? "border-green-300 bg-green-50/30" : "border-gray-200"
      } ${isBye ? "border-dashed border-gray-300" : ""}`}
    >
      {/* 경기 번호 및 상태 */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          경기 {match.matchNo}
        </Badge>
        {isBye && (
          <Badge variant="secondary" className="text-xs">
            BYE
          </Badge>
        )}
        {isCompleted && (
          <Badge variant="default" className="bg-green-600 text-xs">
            완료
          </Badge>
        )}
      </div>

      {/* 팀 정보 */}
      <div className="space-y-2 mb-3">
        <TeamRow
          teamName={homeTeamName}
          teamId={match.homeTeamId || undefined}
          score={homeScore}
          isWinner={isHomeWinner}
          isCurrentTeam={isHomeCurrentTeam}
          isBye={!match.homeTeamId}
        />
        <div className="text-center text-gray-400 text-sm font-semibold">vs</div>
        <TeamRow
          teamName={awayTeamName}
          teamId={match.awayTeamId || undefined}
          score={awayScore}
          isWinner={isAwayWinner}
          isCurrentTeam={isAwayCurrentTeam}
          isBye={!match.awayTeamId}
        />
      </div>

      {/* 결과 입력 버튼 (관리자 전용) - 모바일 최적화 */}
      {canInputScore && onOpenScoreDialog && (
        <Button
          onClick={() => onOpenScoreDialog(match)}
          size="sm"
          className="w-full min-h-[44px] touch-manipulation active:scale-95 transition-transform"
          variant="outline"
        >
          결과 입력
        </Button>
      )}

      {/* 승자 표시 (완료된 경기) */}
      {isCompleted && winnerTeamId && (
        <div className="mt-2 text-xs text-green-600 font-semibold text-center">
          ✅ 승자: {isHomeWinner ? homeTeamName : awayTeamName}
        </div>
      )}
    </div>
  );
}

/**
 * 🔥 토너먼트 브라켓 메인 컴포넌트
 */
export function TournamentBracket({
  matches,
  isAdmin,
  onOpenScoreDialog,
  currentTeamId,
}: TournamentBracketProps) {
  // 🔥 라운드별 경기 그룹화 및 정렬
  const matchesByRound = useMemo(() => {
    const map = new Map<number, MatchOps[]>();
    
    matches.forEach((match) => {
      const round = match.round || 1;
      if (!map.has(round)) {
        map.set(round, []);
      }
      map.get(round)!.push(match);
    });

    // matchNo 순 정렬
    map.forEach((list) => {
      list.sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0));
    });

    // round 순 정렬
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  // 총 라운드 수 계산 (라벨 표시용)
  const totalRounds = matchesByRound.length > 0 
    ? Math.max(...matchesByRound.map(([round]) => round))
    : 0;

  // 우승팀 찾기 (결승 완료 시)
  const championMatch = matchesByRound
    .flatMap(([, matches]) => matches)
    .find((m) => {
      const round = m.round || 0;
      return round >= totalRounds && (m.status === "END" || m.status === "FINISHED");
    });

  const championTeamId = championMatch?.winnerTeamId;
  const championTeamName = championTeamId
    ? championMatch?.winnerTeamId === championMatch?.homeTeamId
      ? championMatch?.homeTeam
      : championMatch?.awayTeam
    : null;

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          브라켓이 아직 생성되지 않았습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🏆 우승팀 배너 (결승 완료 시) */}
      {championTeamName && (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <span className="text-lg font-bold text-yellow-800">
                🏆 우승팀: {championTeamName}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 브라켓 뷰 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            토너먼트 브라켓
          </CardTitle>
        </CardHeader>
      <CardContent>
        {/* 🔥 모바일 최적화: 가로 스크롤 + 스냅 */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
          {matchesByRound.map(([round, roundMatches]) => (
            <div
              key={round}
              className="min-w-[280px] md:min-w-[320px] shrink-0 snap-start"
            >
                <h3 className="font-bold text-center mb-4 text-lg border-b pb-2">
                  {roundLabel(round, totalRounds)}
                  <span className="ml-2 text-sm text-gray-500 font-normal">
                    ({roundMatches.length}경기)
                  </span>
                </h3>

                <div className="flex flex-col gap-4">
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={`${round}-${match.matchNo || match.id}`}
                      match={match}
                      isAdmin={isAdmin}
                      currentTeamId={currentTeamId}
                      onOpenScoreDialog={onOpenScoreDialog}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
