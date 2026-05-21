/**
 * 🔥 대진표 컬럼 컴포넌트
 * 각 라운드를 세로 컬럼으로 표시
 */

import MatchCard from "./MatchCard";

export default function BracketColumn({
  round,
  matches,
}: {
  round: any;
  matches: any[];
}) {
  return (
    <div className="min-w-[220px] md:min-w-[280px]">
      {/* 라운드 헤더 */}
      <h3 className="text-center font-bold mb-4 text-lg md:text-xl text-gray-900 border-b-2 border-gray-300 pb-2">
        {round.title || round.name || `Round ${round.roundNumber}`}
      </h3>

      {/* 경기 카드 목록 */}
      <div className="flex flex-col gap-4">
        {matches.length > 0 ? (
          matches.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            자동 진출
          </div>
        )}
      </div>
    </div>
  );
}

