/**
 * 🔴 Live Score 컴포넌트
 * 
 * 역할:
 * - 실시간 점수 표시
 * - 라이브 인디케이터
 */

import { useLiveMatch } from "@/hooks/useLiveMatch";
import { Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface LiveScoreProps {
  matchId: string;
  className?: string;
}

export function LiveScore({ matchId, className = "" }: LiveScoreProps) {
  const { match, loading } = useLiveMatch(matchId);

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-4 ${className}`}>
        <Skeleton className="h-8 w-16" />
        <span className="text-gray-400">vs</span>
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }

  if (!match) {
    return null;
  }

  const homeScore = match.score?.home || match.homeScore || 0;
  const awayScore = match.score?.away || match.awayScore || 0;
  const isLive = match.status === "live";

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Home Team */}
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-1">
          {match.homeTeamName || "홈 팀"}
        </div>
        <div className="text-4xl font-bold text-gray-900">{homeScore}</div>
      </div>

      {/* VS */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg text-gray-400">vs</span>
        {isLive && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-semibold animate-pulse">
            <Radio className="w-3 h-3" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Away Team */}
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-1">
          {match.awayTeamName || "원정 팀"}
        </div>
        <div className="text-4xl font-bold text-gray-900">{awayScore}</div>
      </div>
    </div>
  );
}
