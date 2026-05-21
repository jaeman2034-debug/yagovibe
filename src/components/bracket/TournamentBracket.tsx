/**
 * Tournament Bracket Visualization Component
 * 
 * 토너먼트 대진표를 트리 형태로 시각화합니다.
 * Admin과 Public 모두에서 사용됩니다.
 */

import type { EventMatch } from "@/types/event";

interface TournamentBracketProps {
  matches: EventMatch[];
  eventId?: string;
}

/**
 * 라운드별 경기 그룹화
 */
function groupMatchesByRound(matches: EventMatch[]): Record<string, EventMatch[]> {
  const rounds: Record<string, EventMatch[]> = {};

  matches.forEach((match) => {
    const roundCode = match.roundCode || "UNKNOWN";
    if (!rounds[roundCode]) {
      rounds[roundCode] = [];
    }
    rounds[roundCode].push(match);
  });

  // 각 라운드 내에서 matchNumber 또는 bracketSlot으로 정렬
  Object.keys(rounds).forEach((roundCode) => {
    rounds[roundCode].sort((a, b) => {
      if (a.matchNumber && b.matchNumber) {
        return a.matchNumber - b.matchNumber;
      }
      if (a.bracketSlot && b.bracketSlot) {
        return a.bracketSlot - b.bracketSlot;
      }
      return 0;
    });
  });

  return rounds;
}

/**
 * 라운드 순서 정의
 */
const ROUND_ORDER = ["R64", "R32", "R16", "QF", "SF", "F"];

/**
 * 라운드 이름 매핑
 */
const ROUND_NAMES: Record<string, string> = {
  R64: "64강",
  R32: "32강",
  R16: "16강",
  QF: "8강",
  SF: "4강",
  F: "결승",
};

/**
 * Tournament Bracket Component
 */
export default function TournamentBracket({ matches, eventId }: TournamentBracketProps) {
  const rounds = groupMatchesByRound(matches);

  // 실제 존재하는 라운드만 필터링
  const existingRounds = ROUND_ORDER.filter((round) => rounds[round] && rounds[round].length > 0);

  if (existingRounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">대진표 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-6 min-w-max px-4 py-6">
        {existingRounds.map((roundCode, roundIndex) => {
          const roundMatches = rounds[roundCode] || [];
          const roundName = ROUND_NAMES[roundCode] || roundCode;

          return (
            <div key={roundCode} className="flex flex-col gap-4 min-w-[200px]">
              {/* 라운드 헤더 */}
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-gray-900">{roundName}</h3>
                <p className="text-xs text-gray-500 mt-1">{roundMatches.length}경기</p>
              </div>

              {/* 경기 목록 */}
              <div className="flex flex-col gap-3">
                {roundMatches.map((match, matchIndex) => (
                  <MatchCard key={match.id} match={match} matchIndex={matchIndex} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 개별 경기 카드 컴포넌트
 */
function MatchCard({ match, matchIndex }: { match: EventMatch; matchIndex: number }) {
  const isCompleted = match.status === "completed";
  const hasWinner = match.winnerTeamId !== null && match.winnerTeamId !== undefined;

  return (
    <div
      className={`border rounded-lg p-3 bg-white shadow-sm transition-all ${
        isCompleted ? "border-green-300 bg-green-50" : "border-gray-200"
      } ${hasWinner ? "ring-2 ring-blue-200" : ""}`}
    >
      {/* 경기 번호 */}
      <div className="text-xs text-gray-400 mb-2 text-center">
        {match.matchNumber ? `경기 ${match.matchNumber}` : `#${matchIndex + 1}`}
      </div>

      {/* 홈팀 */}
      <div
        className={`flex justify-between items-center py-2 px-2 rounded ${
          match.winnerTeamId === match.homeTeamId && isCompleted
            ? "bg-blue-100 font-semibold"
            : ""
        }`}
      >
        <span className="text-sm text-gray-900 truncate flex-1 mr-2">
          {match.homeTeamName || match.homeTeamId || "TBD"}
        </span>
        <span
          className={`text-sm font-medium min-w-[24px] text-right ${
            isCompleted ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : "-"}
        </span>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-gray-200 my-1"></div>

      {/* 어웨이팀 */}
      <div
        className={`flex justify-between items-center py-2 px-2 rounded ${
          match.winnerTeamId === match.awayTeamId && isCompleted
            ? "bg-blue-100 font-semibold"
            : ""
        }`}
      >
        <span className="text-sm text-gray-900 truncate flex-1 mr-2">
          {match.awayTeamName || match.awayTeamId || "TBD"}
        </span>
        <span
          className={`text-sm font-medium min-w-[24px] text-right ${
            isCompleted ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : "-"}
        </span>
      </div>

      {/* 상태 표시 */}
      {isCompleted && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-green-600 font-medium">완료</span>
          </div>
        </div>
      )}

      {/* 일정 표시 */}
      {match.scheduledAt && !isCompleted && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            {match.scheduledAt.toDate
              ? match.scheduledAt.toDate().toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </div>
        </div>
      )}
    </div>
  );
}
